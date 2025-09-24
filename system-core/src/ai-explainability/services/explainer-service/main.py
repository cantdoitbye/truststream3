"""
Core Explainer Service for TrustStram v4.4

Provides unified API for SHAP, InterpretML, and HAG-XAI explanations
with Redis caching and stakeholder-specific output formatting.
"""

import asyncio
import json
import logging
import time
from datetime import datetime
from typing import Dict, List, Any, Optional, Union

import redis.asyncio as aioredis
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import numpy as np
import pandas as pd

# Core explanation engines
from core.interpretability.shap_engine import SHAPEngine
from core.interpretability.interpretml_framework import TrustStramInterpretMLFramework
from core.interpretability.hag_xai import HAGXAIEngine
from core.interpretability.counterfactual_engine import CounterfactualEngine
from utils.model_registry import ModelRegistry
from utils.explanation_cache import ExplanationCache
from utils.performance_monitor import PerformanceMonitor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="TrustStram Explainer Service",
    description="Core explanation generation service with SHAP, InterpretML, and HAG-XAI",
    version="4.4.0"
)

# Request/Response Models
class ExplanationRequest(BaseModel):
    model_id: str
    instance_data: Dict[str, Any]
    explanation_type: str  # 'shap', 'interpretml', 'hag_xai', 'counterfactual'
    stakeholder_type: str  # 'end_user', 'technical_user', 'business_user'
    cache_ttl: Optional[int] = 3600  # Cache TTL in seconds
    include_uncertainty: bool = False
    max_features: Optional[int] = 10
    
class ExplanationResponse(BaseModel):
    explanation_id: str
    model_id: str
    explanation_type: str
    stakeholder_type: str
    explanation_data: Dict[str, Any]
    confidence_score: float
    generation_time_ms: float
    cache_hit: bool
    timestamp: str
    compliance_metadata: Dict[str, Any]

class HealthResponse(BaseModel):
    status: str
    version: str
    uptime_seconds: float
    cache_status: str
    models_loaded: int

# Global components
shap_engine = None
interpretml_framework = None
hag_xai_engine = None
counterfactual_engine = None
model_registry = None
explanation_cache = None
performance_monitor = None
redis_client = None

START_TIME = time.time()

@app.on_event("startup")
async def startup_event():
    """Initialize all explanation engines and supporting services."""
    global shap_engine, interpretml_framework, hag_xai_engine, counterfactual_engine
    global model_registry, explanation_cache, performance_monitor, redis_client
    
    try:
        # Initialize Redis connection
        redis_client = aioredis.Redis.from_url(
            "redis://localhost:6379", 
            decode_responses=True
        )
        await redis_client.ping()
        logger.info("Redis connection established")
        
        # Initialize explanation engines
        shap_engine = SHAPEngine()
        interpretml_framework = TrustStramInterpretMLFramework()
        hag_xai_engine = HAGXAIEngine()
        counterfactual_engine = CounterfactualEngine()
        
        # Initialize supporting services
        model_registry = ModelRegistry()
        explanation_cache = ExplanationCache(redis_client)
        performance_monitor = PerformanceMonitor()
        
        # Load available models
        await model_registry.load_models()
        
        logger.info("Explainer service initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize explainer service: {str(e)}")
        raise

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    try:
        # Check Redis connection
        await redis_client.ping()
        cache_status = "healthy"
    except:
        cache_status = "unhealthy"
    
    return HealthResponse(
        status="healthy",
        version="4.4.0",
        uptime_seconds=time.time() - START_TIME,
        cache_status=cache_status,
        models_loaded=len(model_registry.models) if model_registry else 0
    )

@app.post("/explain", response_model=ExplanationResponse)
async def generate_explanation(
    request: ExplanationRequest,
    background_tasks: BackgroundTasks
):
    """Generate model explanation with caching and performance monitoring."""
    start_time = time.time()
    
    try:
        # Generate cache key
        cache_key = await explanation_cache.generate_cache_key(
            request.model_id,
            request.instance_data,
            request.explanation_type,
            request.stakeholder_type
        )
        
        # Check cache first
        cached_explanation = await explanation_cache.get(cache_key)
        if cached_explanation:
            logger.info(f"Cache hit for explanation {cache_key}")
            return ExplanationResponse(
                **cached_explanation,
                cache_hit=True,
                generation_time_ms=(time.time() - start_time) * 1000
            )
        
        # Get model from registry
        model_info = await model_registry.get_model(request.model_id)
        if not model_info:
            raise HTTPException(status_code=404, message=f"Model {request.model_id} not found")
        
        # Generate explanation based on type
        explanation_data = await _generate_explanation(
            request, model_info
        )
        
        # Calculate confidence score
        confidence_score = await _calculate_confidence_score(
            explanation_data, request.explanation_type
        )
        
        # Format for stakeholder
        formatted_explanation = await _format_for_stakeholder(
            explanation_data, request.stakeholder_type, request.max_features
        )
        
        # Generate compliance metadata
        compliance_metadata = await _generate_compliance_metadata(
            request, explanation_data
        )
        
        # Create response
        response = ExplanationResponse(
            explanation_id=cache_key,
            model_id=request.model_id,
            explanation_type=request.explanation_type,
            stakeholder_type=request.stakeholder_type,
            explanation_data=formatted_explanation,
            confidence_score=confidence_score,
            generation_time_ms=(time.time() - start_time) * 1000,
            cache_hit=False,
            timestamp=datetime.now().isoformat(),
            compliance_metadata=compliance_metadata
        )
        
        # Cache the explanation
        background_tasks.add_task(
            explanation_cache.set,
            cache_key,
            response.dict(),
            request.cache_ttl
        )
        
        # Log performance metrics
        background_tasks.add_task(
            performance_monitor.log_explanation,
            request.explanation_type,
            response.generation_time_ms,
            len(str(explanation_data))
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Error generating explanation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def _generate_explanation(
    request: ExplanationRequest,
    model_info: Dict[str, Any]
) -> Dict[str, Any]:
    """Generate explanation using the specified method."""
    
    instance_df = pd.DataFrame([request.instance_data])
    
    if request.explanation_type == 'shap':
        return await shap_engine.explain_instance(
            model_info['model'],
            instance_df,
            model_info.get('feature_names', []),
            include_uncertainty=request.include_uncertainty
        )
    
    elif request.explanation_type == 'interpretml':
        return await interpretml_framework.explain_instance(
            model_info['model'],
            instance_df,
            max_features=request.max_features
        )
    
    elif request.explanation_type == 'hag_xai':
        return await hag_xai_engine.generate_explanation(
            model_info['model'],
            instance_df,
            attention_weights=model_info.get('attention_weights')
        )
    
    elif request.explanation_type == 'counterfactual':
        return await counterfactual_engine.generate_counterfactuals(
            model_info['model'],
            instance_df,
            desired_outcome=request.instance_data.get('desired_outcome'),
            max_changes=request.max_features or 3
        )
    
    else:
        raise ValueError(f"Unsupported explanation type: {request.explanation_type}")

async def _calculate_confidence_score(
    explanation_data: Dict[str, Any],
    explanation_type: str
) -> float:
    """Calculate confidence score for the explanation."""
    
    if explanation_type == 'shap':
        # Use SHAP value magnitude and consistency
        shap_values = explanation_data.get('shap_values', [])
        if shap_values:
            magnitude = np.mean(np.abs(shap_values))
            return min(magnitude * 10, 1.0)  # Normalize to 0-1
    
    elif explanation_type == 'interpretml':
        # Use model's internal confidence if available
        return explanation_data.get('confidence', 0.8)
    
    elif explanation_type == 'hag_xai':
        # Use attention consistency score
        return explanation_data.get('attention_consistency', 0.75)
    
    elif explanation_type == 'counterfactual':
        # Use proximity and feasibility scores
        proximity = explanation_data.get('proximity_score', 0.5)
        feasibility = explanation_data.get('feasibility_score', 0.5)
        return (proximity + feasibility) / 2
    
    return 0.5  # Default confidence

async def _format_for_stakeholder(
    explanation_data: Dict[str, Any],
    stakeholder_type: str,
    max_features: Optional[int]
) -> Dict[str, Any]:
    """Format explanation data for specific stakeholder type."""
    
    if stakeholder_type == 'end_user':
        return {
            'summary': explanation_data.get('natural_language_summary', 'No summary available'),
            'key_factors': explanation_data.get('top_features', [])[:3],
            'confidence_level': explanation_data.get('confidence_level', 'moderate'),
            'actionable_insights': explanation_data.get('recommendations', [])
        }
    
    elif stakeholder_type == 'technical_user':
        return {
            'feature_importance': explanation_data.get('feature_importance', {}),
            'shap_values': explanation_data.get('shap_values', []),
            'model_uncertainty': explanation_data.get('uncertainty_measures', {}),
            'technical_details': explanation_data.get('technical_metadata', {}),
            'debug_info': explanation_data.get('debug_information', {})
        }
    
    elif stakeholder_type == 'business_user':
        return {
            'business_impact': explanation_data.get('business_metrics', {}),
            'risk_factors': explanation_data.get('risk_assessment', []),
            'recommendation': explanation_data.get('business_recommendation', ''),
            'confidence_percentage': explanation_data.get('confidence_percentage', 0),
            'compliance_status': explanation_data.get('compliance_check', {})
        }
    
    return explanation_data  # Return full data if stakeholder type unknown

async def _generate_compliance_metadata(
    request: ExplanationRequest,
    explanation_data: Dict[str, Any]
) -> Dict[str, Any]:
    """Generate compliance metadata for audit trails."""
    
    return {
        'gdpr_article_22': {
            'right_to_explanation': True,
            'automated_decision': True,
            'human_oversight_available': True
        },
        'eu_ai_act': {
            'transparency_level': 'high',
            'risk_category': explanation_data.get('risk_category', 'low'),
            'documentation_complete': True
        },
        'audit_trail': {
            'explanation_method': request.explanation_type,
            'data_sources': explanation_data.get('data_sources', []),
            'model_version': explanation_data.get('model_version', 'unknown'),
            'timestamp': datetime.now().isoformat()
        }
    }

@app.get("/models")
async def list_models():
    """List available models for explanation."""
    return await model_registry.list_models()

@app.get("/metrics")
async def get_metrics():
    """Get performance metrics for the service."""
    return await performance_monitor.get_metrics()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
