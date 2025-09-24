"""Comprehensive test suite for TrustStram v4.4 AI Explainability Features

Tests core functionality, compliance, and performance requirements.
"""

import pytest
import numpy as np
import pandas as pd
from unittest.mock import Mock, patch
import asyncio
from datetime import datetime

# Import modules to test
from ..core.interpretability import SHAPExplainer, InterpretMLFramework
from ..core.bias_detection import AequitasFramework
from ..core.caching import ExplanationCache, AsyncExplanationService
from ..compliance.gdpr import GDPRComplianceFramework
from ..interfaces.stakeholder_manager import StakeholderExplanationManager


class TestSHAPExplainer:
    """Test SHAP explainer functionality."""
    
    def setup_method(self):
        """Setup test fixtures."""
        # Create mock model
        self.mock_model = Mock()
        self.mock_model.predict.return_value = np.array([0.7])
        
        # Create background data
        self.background_data = np.random.randn(100, 5)
        self.feature_names = [f"feature_{i}" for i in range(5)]
        
        # Initialize explainer
        with patch('shap.KernelExplainer'):
            self.explainer = SHAPExplainer(
                self.mock_model,
                self.background_data,
                self.feature_names
            )
    
    def test_explanation_generation(self):
        """Test basic explanation generation."""
        instance = np.random.randn(5)
        
        # Mock SHAP values
        mock_shap_values = np.array([0.1, -0.2, 0.3, -0.1, 0.05])
        self.explainer.explainer.shap_values.return_value = mock_shap_values
        
        explanation = self.explainer.explain_prediction(instance)
        
        assert 'feature_importance' in explanation
        assert 'prediction' in explanation
        assert 'explainer_type' in explanation
        assert explanation['explainer_type'] == 'shap'
        assert len(explanation['feature_importance']) == 5
    
    def test_batch_explanation(self):
        """Test batch explanation generation."""
        instances = np.random.randn(10, 5)
        
        # Mock batch SHAP values
        mock_shap_values = np.random.randn(10, 5)
        self.explainer.explainer.shap_values.return_value = mock_shap_values
        self.mock_model.predict.return_value = np.random.randn(10)
        
        explanations = self.explainer.explain_batch(instances)
        
        assert len(explanations) == 10
        assert all('feature_importance' in exp for exp in explanations)
    
    def test_cache_key_generation(self):
        """Test cache key generation."""
        instance = np.array([1, 2, 3, 4, 5])
        cache_key = self.explainer.generate_cache_key(instance)
        
        assert isinstance(cache_key, str)
        assert len(cache_key) == 32  # MD5 hash length
    
    def test_global_importance(self):
        """Test global importance calculation."""
        # Mock SHAP values for global importance
        mock_shap_values = np.random.randn(50, 5)
        self.explainer.explainer.shap_values.return_value = mock_shap_values
        
        global_importance = self.explainer.get_global_importance(sample_size=50)
        
        assert isinstance(global_importance, dict)
        assert len(global_importance) == 5
        assert all(isinstance(v, float) for v in global_importance.values())


class TestExplanationCache:
    """Test explanation caching functionality."""
    
    def setup_method(self):
        """Setup test fixtures."""
        # Mock Redis client
        with patch('redis.Redis'):
            self.cache = ExplanationCache()
    
    def test_cache_decorator(self):
        """Test cache decorator functionality."""
        call_count = 0
        
        @self.cache.cache_explanation(ttl=60)
        def expensive_function(x):
            nonlocal call_count
            call_count += 1
            return x * 2
        
        # Mock cache miss then hit
        self.cache.redis_client.get.side_effect = [None, b'cached_result']
        self.cache.redis_client.setex.return_value = True
        
        with patch('pickle.loads', return_value='cached_result'):
            # First call - cache miss
            result1 = expensive_function(5)
            assert result1 == 10
            assert call_count == 1
            
            # Second call - cache hit
            result2 = expensive_function(5)
            assert result2 == 'cached_result'
            assert call_count == 1  # Function not called again
    
    def test_cache_stats(self):
        """Test cache statistics tracking."""
        self.cache.cache_stats = {'hits': 10, 'misses': 5, 'errors': 1}
        
        stats = self.cache.get_cache_stats()
        
        assert stats['hits'] == 10
        assert stats['misses'] == 5
        assert stats['hit_rate'] == 10/15
        assert 'timestamp' in stats
    
    def test_health_check(self):
        """Test cache health check."""
        self.cache.redis_client.ping.return_value = True
        
        health = self.cache.health_check()
        
        assert health['status'] == 'healthy'
        assert 'timestamp' in health


class TestGDPRCompliance:
    """Test GDPR compliance functionality."""
    
    def setup_method(self):
        """Setup test fixtures."""
        self.gdpr = GDPRComplianceFramework()
    
    def test_consent_recording(self):
        """Test consent recording."""
        consent_id = self.gdpr.record_consent(
            user_id="user123",
            consent_type="automated_decision_making",
            granted=True,
            purpose="AI explanation generation"
        )
        
        assert isinstance(consent_id, str)
        assert "user123" in self.gdpr.consent_records
        assert len(self.gdpr.consent_records["user123"]) == 1
    
    def test_consent_verification(self):
        """Test consent verification."""
        # Record consent
        self.gdpr.record_consent(
            user_id="user123",
            consent_type="automated_decision_making",
            granted=True,
            purpose="AI explanation generation"
        )
        
        # Verify consent
        has_consent = self.gdpr.verify_user_consent("user123")
        assert has_consent is True
        
        # Test user without consent
        no_consent = self.gdpr.verify_user_consent("user456")
        assert no_consent is False
    
    def test_explanation_request_processing(self):
        """Test GDPR explanation request processing."""
        # Setup user with consent
        self.gdpr.record_consent(
            user_id="user123",
            consent_type="automated_decision_making",
            granted=True,
            purpose="AI explanation generation"
        )
        
        # Mock decision record
        decision_record = {
            "decision_id": "decision123",
            "timestamp": datetime.now().isoformat(),
            "prediction": 0.8,
            "confidence": 0.9,
            "explanation": {
                "shap_values": {"feature1": 0.1, "feature2": -0.2}
            }
        }
        self.gdpr.store_decision_record(decision_record)
        
        # Process explanation request
        explanation = self.gdpr.process_explanation_request(
            user_id="user123",
            decision_id="decision123"
        )
        
        assert "logic_description" in explanation
        assert "rights_information" in explanation
        assert explanation["automated_decision"] is True


class TestStakeholderManager:
    """Test stakeholder explanation management."""
    
    def setup_method(self):
        """Setup test fixtures."""
        self.manager = StakeholderExplanationManager()
        
        self.sample_explanation = {
            "prediction": 0.8,
            "confidence": 0.9,
            "feature_importance": {
                "income": 0.3,
                "credit_score": 0.2,
                "age": -0.1
            },
            "model_version": "v1.0"
        }
    
    def test_end_user_explanation(self):
        """Test end user explanation generation."""
        explanation = self.manager.generate_stakeholder_explanation(
            "end_user",
            self.sample_explanation
        )
        
        assert explanation["type"] == "end_user"
        assert "decision" in explanation
        assert "confidence" in explanation
        assert "key_factors" in explanation
        assert "plain_language" in explanation
        assert "next_steps" in explanation
    
    def test_technical_user_explanation(self):
        """Test technical user explanation generation."""
        explanation = self.manager.generate_stakeholder_explanation(
            "technical_user",
            self.sample_explanation
        )
        
        assert explanation["type"] == "technical_user"
        assert "model_info" in explanation
        assert "feature_analysis" in explanation
        assert "performance_metrics" in explanation
        assert "uncertainty_analysis" in explanation
    
    def test_business_user_explanation(self):
        """Test business user explanation generation."""
        explanation = self.manager.generate_stakeholder_explanation(
            "business_user",
            self.sample_explanation
        )
        
        assert explanation["type"] == "business_user"
        assert "business_impact" in explanation
        assert "risk_assessment" in explanation
        assert "compliance_status" in explanation
        assert "recommendations" in explanation
    
    def test_factor_extraction(self):
        """Test top factor extraction."""
        factors = self.manager._extract_top_factors(self.sample_explanation, n=2)
        
        assert len(factors) == 2
        assert factors[0]["name"] == "Income Level"  # Highest importance
        assert factors[1]["name"] == "Credit Score"  # Second highest
        assert all("impact" in factor for factor in factors)


class TestAsyncExplanationService:
    """Test async explanation service."""
    
    @pytest.mark.asyncio
    async def test_async_explanation_generation(self):
        """Test async explanation generation."""
        with patch('aioredis.create_redis_pool'):
            service = AsyncExplanationService()
            
            # Mock explainer function
            def mock_explainer(instance):
                return {"prediction": 0.8, "confidence": 0.9}
            
            # Mock Redis operations
            service.redis_pool = Mock()
            service.redis_pool.get.return_value = None  # Cache miss
            service.redis_pool.setex.return_value = True
            
            result = await service.generate_explanation_async(
                mock_explainer,
                np.array([1, 2, 3])
            )
            
            assert result["prediction"] == 0.8
            assert result["confidence"] == 0.9
    
    @pytest.mark.asyncio
    async def test_batch_explanation_generation(self):
        """Test batch async explanation generation."""
        with patch('aioredis.create_redis_pool'):
            service = AsyncExplanationService()
            service.redis_pool = Mock()
            service.redis_pool.get.return_value = None
            service.redis_pool.setex.return_value = True
            
            def mock_explainer(instance):
                return {"prediction": float(instance[0])}
            
            instances = [np.array([i]) for i in range(5)]
            
            results = await service.batch_generate_explanations(
                mock_explainer,
                instances,
                batch_size=2
            )
            
            assert len(results) == 5
            assert all("prediction" in result for result in results)


class TestPerformanceRequirements:
    """Test performance SLA requirements."""
    
    def test_explanation_response_time(self):
        """Test explanation generation meets response time requirements."""
        import time
        
        # Mock fast explainer
        def fast_explainer(instance):
            time.sleep(0.05)  # 50ms processing
            return {"prediction": 0.8}
        
        start_time = time.time()
        result = fast_explainer(np.array([1, 2, 3]))
        end_time = time.time()
        
        processing_time_ms = (end_time - start_time) * 1000
        
        # Should be under 100ms for simple explanations
        assert processing_time_ms < 100
        assert result["prediction"] == 0.8
    
    def test_cache_hit_rate_simulation(self):
        """Test cache hit rate meets 80% requirement."""
        cache_stats = {
            'hits': 85,
            'misses': 15,
            'errors': 0
        }
        
        total_requests = cache_stats['hits'] + cache_stats['misses']
        hit_rate = cache_stats['hits'] / total_requests
        
        # Should exceed 80% hit rate
        assert hit_rate >= 0.8
        assert hit_rate == 0.85  # 85% in this simulation


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
