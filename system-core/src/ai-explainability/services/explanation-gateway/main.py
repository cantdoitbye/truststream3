"""Explanation Gateway Service for TrustStram v4.4

API gateway for all explanation requests with load balancing,
caching, and stakeholder-aware routing.
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional, Union
import uvicorn
import logging
import asyncio
from datetime import datetime
import uuid
import numpy as np

# Import core explainability modules
from ...core.interpretability import SHAPExplainer, InterpretMLFramework
from ...core.caching import ExplanationCache, AsyncExplanationService
from ...core.bias_detection import AequitasFramework

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="TrustStram AI Explainability Gateway",
    description="API gateway for AI explanation services",
    version="4.4.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Global services
cache_service = None
async_service = None
active_explainers = {}


# Pydantic models
class ExplanationRequest(BaseModel):
    """Request model for explanation generation."""
    model_id: str = Field(..., description="ID of the model to explain")
    input_data: Union[List[float], Dict[str, Any]] = Field(..., description="Input data for explanation")
    explanation_type: str = Field(default="shap", description="Type of explanation (shap, lime, interpret_ml)")
    stakeholder_type: str = Field(default="technical_user", description="Type of stakeholder (end_user, technical_user, business_user)")
    feature_names: Optional[List[str]] = Field(None, description="Names of input features")
    cache_enabled: bool = Field(default=True, description="Whether to use caching")
    

class ExplanationResponse(BaseModel):
    """Response model for explanation results."""
    explanation_id: str
    status: str  # "completed", "processing", "failed"
    explanation: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    timestamp: str
    processing_time_ms: Optional[float] = None


class BiasAuditRequest(BaseModel):
    """Request model for bias auditing."""
    model_id: str
    predictions: List[Union[int, float]]
    ground_truth: List[Union[int, float]]
    scores: List[float]
    sensitive_attributes: Dict[str, List[Any]]
    metrics: Optional[List[str]] = None
    threshold: float = Field(default=0.5, ge=0.0, le=1.0)


class ModelRegistrationRequest(BaseModel):
    """Request model for registering new models."""
    model_id: str
    model_type: str  # "classification", "regression"
    model_format: str  # "sklearn", "pytorch", "tensorflow"
    feature_names: List[str]
    background_data: Optional[List[List[float]]] = None
    description: Optional[str] = None


# Dependency injection
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Authenticate user from JWT token."""
    # TODO: Implement proper JWT validation
    return {"user_id": "user123", "role": "analyst"}


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    global cache_service, async_service
    
    try:
        # Initialize caching service
        cache_service = ExplanationCache()
        logger.info("Cache service initialized")
        
        # Initialize async explanation service
        async_service = AsyncExplanationService()
        await async_service.initialize()
        logger.info("Async explanation service initialized")
        
    except Exception as e:
        logger.error(f"Startup error: {str(e)}")
        raise


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    global async_service
    
    if async_service:
        await async_service.close()
        logger.info("Services shut down gracefully")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    cache_health = cache_service.health_check() if cache_service else {"status": "not_initialized"}
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "4.4.0",
        "cache_status": cache_health["status"],
        "active_explainers": len(active_explainers)
    }


@app.post("/models/register", response_model=Dict[str, str])
async def register_model(request: ModelRegistrationRequest, user: dict = Depends(get_current_user)):
    """Register a new model for explanation."""
    try:
        # Store model metadata
        model_info = {
            "model_id": request.model_id,
            "model_type": request.model_type,
            "model_format": request.model_format,
            "feature_names": request.feature_names,
            "description": request.description,
            "registered_by": user["user_id"],
            "registered_at": datetime.now().isoformat()
        }
        
        # TODO: Store in proper model registry
        logger.info(f"Model registered: {request.model_id}")
        
        return {
            "message": "Model registered successfully",
            "model_id": request.model_id
        }
        
    except Exception as e:
        logger.error(f"Model registration error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/explain", response_model=ExplanationResponse)
async def generate_explanation(
    request: ExplanationRequest, 
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """Generate explanation for model prediction."""
    explanation_id = str(uuid.uuid4())
    start_time = datetime.now()
    
    try:
        # Convert input data to numpy array
        if isinstance(request.input_data, dict):
            input_array = np.array(list(request.input_data.values()))
        else:
            input_array = np.array(request.input_data)
        
        # Reshape if needed
        if len(input_array.shape) == 1:
            input_array = input_array.reshape(1, -1)
        
        # Route to appropriate explanation service
        if request.explanation_type == "shap":
            explanation = await _generate_shap_explanation(
                request.model_id,
                input_array,
                request.feature_names,
                request.cache_enabled
            )
        elif request.explanation_type == "interpret_ml":
            explanation = await _generate_interpret_ml_explanation(
                request.model_id,
                input_array,
                request.cache_enabled
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported explanation type: {request.explanation_type}")
        
        # Adapt explanation for stakeholder
        adapted_explanation = _adapt_explanation_for_stakeholder(
            explanation,
            request.stakeholder_type
        )
        
        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return ExplanationResponse(
            explanation_id=explanation_id,
            status="completed",
            explanation=adapted_explanation,
            timestamp=datetime.now().isoformat(),
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"Explanation generation error: {str(e)}")
        
        return ExplanationResponse(
            explanation_id=explanation_id,
            status="failed",
            error_message=str(e),
            timestamp=datetime.now().isoformat()
        )


@app.post("/audit/bias")
async def audit_bias(request: BiasAuditRequest, user: dict = Depends(get_current_user)):
    """Perform bias audit on model predictions."""
    try:
        # Initialize Aequitas framework
        aequitas = AequitasFramework()
        
        # Prepare audit data
        audit_data = aequitas.prepare_audit_data(
            predictions=request.predictions,
            ground_truth=request.ground_truth,
            scores=request.scores,
            sensitive_attributes=request.sensitive_attributes
        )
        
        # Perform bias audit
        audit_results = aequitas.audit_model_fairness(
            audit_data,
            metrics=request.metrics,
            threshold=request.threshold
        )
        
        return {
            "audit_id": str(uuid.uuid4()),
            "model_id": request.model_id,
            "audit_results": audit_results,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Bias audit error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/cache/stats")
async def get_cache_stats(user: dict = Depends(get_current_user)):
    """Get cache performance statistics."""
    if not cache_service:
        raise HTTPException(status_code=503, detail="Cache service not available")
    
    return cache_service.get_cache_stats()


@app.delete("/cache/clear")
async def clear_cache(pattern: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Clear cache entries."""
    if not cache_service:
        raise HTTPException(status_code=503, detail="Cache service not available")
    
    deleted_count = cache_service.clear_cache(pattern)
    
    return {
        "message": f"Cleared {deleted_count} cache entries",
        "pattern": pattern,
        "timestamp": datetime.now().isoformat()
    }


# Helper functions
async def _generate_shap_explanation(model_id: str, input_data: np.ndarray, feature_names: Optional[List[str]], cache_enabled: bool) -> Dict[str, Any]:
    """Generate SHAP-based explanation."""
    # TODO: Load model from model registry
    # For now, return mock explanation
    
    mock_explanation = {
        "explainer_type": "shap",
        "feature_importance": {
            f"feature_{i}": float(np.random.randn()) for i in range(len(input_data[0]))
        },
        "prediction": float(np.random.random()),
        "confidence": float(np.random.random()),
        "model_id": model_id
    }
    
    return mock_explanation


async def _generate_interpret_ml_explanation(model_id: str, input_data: np.ndarray, cache_enabled: bool) -> Dict[str, Any]:
    """Generate InterpretML-based explanation."""
    # TODO: Implement InterpretML explanation generation
    
    mock_explanation = {
        "explainer_type": "interpret_ml",
        "local_explanation": {"feature_scores": [float(np.random.randn()) for _ in range(len(input_data[0]))]},
        "model_id": model_id
    }
    
    return mock_explanation


def _adapt_explanation_for_stakeholder(explanation: Dict[str, Any], stakeholder_type: str) -> Dict[str, Any]:
    """Adapt explanation format for specific stakeholder type."""
    if stakeholder_type == "end_user":
        # Simplify for end users
        return {
            "decision": explanation.get("prediction", "unknown"),
            "confidence": f"{explanation.get('confidence', 0):.0%}",
            "key_factors": _extract_top_factors(explanation),
            "explanation_type": "simple"
        }
    elif stakeholder_type == "business_user":
        # Business-focused view
        return {
            "business_impact": explanation.get("prediction", "unknown"),
            "risk_level": _calculate_risk_level(explanation),
            "key_drivers": _extract_top_factors(explanation),
            "explanation_type": "business"
        }
    else:  # technical_user
        # Full technical details
        return explanation


def _extract_top_factors(explanation: Dict[str, Any], n: int = 3) -> List[Dict[str, Any]]:
    """Extract top contributing factors from explanation."""
    feature_importance = explanation.get("feature_importance", {})
    
    # Sort by absolute importance
    sorted_features = sorted(
        feature_importance.items(),
        key=lambda x: abs(x[1]),
        reverse=True
    )
    
    return [
        {
            "name": name,
            "importance": importance,
            "impact": "positive" if importance > 0 else "negative"
        }
        for name, importance in sorted_features[:n]
    ]


def _calculate_risk_level(explanation: Dict[str, Any]) -> str:
    """Calculate business risk level from explanation."""
    confidence = explanation.get("confidence", 0.5)
    
    if confidence > 0.8:
        return "low"
    elif confidence > 0.6:
        return "medium"
    else:
        return "high"


# Run the application
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8080,
        reload=True,
        workers=1
    )
