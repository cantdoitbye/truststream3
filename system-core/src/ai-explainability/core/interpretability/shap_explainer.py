"""SHAP-based explainer implementation for TrustStram v4.4

Based on research findings showing SHAP's superiority over LIME for
feature importance analysis with solid game theory foundation.
"""

import shap
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional, Union, List
import logging
from datetime import datetime
import hashlib

logger = logging.getLogger(__name__)


class SHAPExplainer:
    """SHAP-based explanation generator with caching and optimization."""
    
    def __init__(self, model, background_data: np.ndarray, feature_names: Optional[List[str]] = None):
        """
        Initialize SHAP explainer.
        
        Args:
            model: Trained model with predict method
            background_data: Representative background dataset for SHAP
            feature_names: Names of input features
        """
        self.model = model
        self.background_data = background_data
        self.feature_names = feature_names or [f"feature_{i}" for i in range(background_data.shape[1])]
        
        # Initialize appropriate SHAP explainer based on model type
        self.explainer = self._initialize_explainer()
        
        logger.info(f"SHAP explainer initialized with {len(self.feature_names)} features")
    
    def _initialize_explainer(self):
        """Initialize the most appropriate SHAP explainer for the model."""
        try:
            # Try TreeExplainer for tree-based models (fastest)
            if hasattr(self.model, 'feature_importances_'):
                return shap.TreeExplainer(self.model)
        except Exception:
            pass
            
        try:
            # Try LinearExplainer for linear models
            if hasattr(self.model, 'coef_'):
                return shap.LinearExplainer(self.model, self.background_data)
        except Exception:
            pass
        
        # Fallback to KernelExplainer (model-agnostic but slower)
        return shap.KernelExplainer(self.model.predict, self.background_data)
    
    def explain_prediction(self, instance: np.ndarray, return_expected_value: bool = True) -> Dict[str, Any]:
        """
        Generate SHAP explanation for a single prediction.
        
        Args:
            instance: Input instance to explain
            return_expected_value: Whether to include expected value
            
        Returns:
            Dictionary containing SHAP explanation components
        """
        try:
            # Ensure instance is 2D
            if len(instance.shape) == 1:
                instance = instance.reshape(1, -1)
            
            # Generate SHAP values
            shap_values = self.explainer.shap_values(instance)
            
            # Handle multi-class case
            if isinstance(shap_values, list):
                # For multi-class, take the values for the predicted class
                prediction = self.model.predict(instance)[0]
                predicted_class = int(prediction) if hasattr(prediction, '__int__') else np.argmax(prediction)
                shap_values = shap_values[predicted_class]
            
            # Flatten if needed
            if len(shap_values.shape) > 1:
                shap_values = shap_values[0]
            
            # Create explanation dictionary
            explanation = {
                'feature_importance': dict(zip(self.feature_names, shap_values)),
                'prediction': self.model.predict(instance)[0],
                'timestamp': datetime.now().isoformat(),
                'explainer_type': 'shap',
                'shap_values': shap_values.tolist()
            }
            
            # Add expected value if available and requested
            if return_expected_value and hasattr(self.explainer, 'expected_value'):
                expected_value = self.explainer.expected_value
                if isinstance(expected_value, np.ndarray):
                    expected_value = expected_value[0] if expected_value.size == 1 else expected_value.tolist()
                explanation['base_value'] = expected_value
            
            return explanation
            
        except Exception as e:
            logger.error(f"Error generating SHAP explanation: {str(e)}")
            return {
                'error': str(e),
                'explainer_type': 'shap',
                'timestamp': datetime.now().isoformat()
            }
    
    def explain_batch(self, instances: np.ndarray, batch_size: int = 100) -> List[Dict[str, Any]]:
        """
        Generate SHAP explanations for multiple instances.
        
        Args:
            instances: Batch of instances to explain
            batch_size: Size of processing batches
            
        Returns:
            List of explanation dictionaries
        """
        explanations = []
        
        for i in range(0, len(instances), batch_size):
            batch = instances[i:i + batch_size]
            
            try:
                batch_shap_values = self.explainer.shap_values(batch)
                
                # Handle multi-class case
                if isinstance(batch_shap_values, list):
                    predictions = self.model.predict(batch)
                    for j, pred in enumerate(predictions):
                        predicted_class = int(pred) if hasattr(pred, '__int__') else np.argmax(pred)
                        shap_vals = batch_shap_values[predicted_class][j]
                        
                        explanation = {
                            'feature_importance': dict(zip(self.feature_names, shap_vals)),
                            'prediction': pred,
                            'timestamp': datetime.now().isoformat(),
                            'explainer_type': 'shap',
                            'shap_values': shap_vals.tolist()
                        }
                        explanations.append(explanation)
                else:
                    predictions = self.model.predict(batch)
                    for j, (shap_vals, pred) in enumerate(zip(batch_shap_values, predictions)):
                        explanation = {
                            'feature_importance': dict(zip(self.feature_names, shap_vals)),
                            'prediction': pred,
                            'timestamp': datetime.now().isoformat(),
                            'explainer_type': 'shap',
                            'shap_values': shap_vals.tolist()
                        }
                        explanations.append(explanation)
                        
            except Exception as e:
                logger.error(f"Error in batch explanation: {str(e)}")
                # Add error entries for failed batch
                for _ in range(len(batch)):
                    explanations.append({
                        'error': str(e),
                        'explainer_type': 'shap',
                        'timestamp': datetime.now().isoformat()
                    })
        
        return explanations
    
    def generate_visualization_data(self, instance: np.ndarray, explanation_type: str = 'waterfall') -> Dict[str, Any]:
        """
        Generate data for SHAP visualizations.
        
        Args:
            instance: Input instance
            explanation_type: Type of visualization ('waterfall', 'force', 'bar')
            
        Returns:
            Visualization data dictionary
        """
        explanation = self.explain_prediction(instance)
        
        if 'error' in explanation:
            return explanation
        
        shap_values = np.array(explanation['shap_values'])
        base_value = explanation.get('base_value', 0)
        
        viz_data = {
            'type': explanation_type,
            'feature_names': self.feature_names,
            'shap_values': shap_values.tolist(),
            'feature_values': instance.tolist() if len(instance.shape) == 1 else instance[0].tolist(),
            'base_value': base_value,
            'prediction': explanation['prediction']
        }
        
        if explanation_type == 'waterfall':
            # Sort features by absolute SHAP value for waterfall
            sorted_indices = np.argsort(np.abs(shap_values))[::-1]
            viz_data['sorted_indices'] = sorted_indices.tolist()
            
        elif explanation_type == 'bar':
            # Get top positive and negative contributors
            positive_contribs = [(i, val) for i, val in enumerate(shap_values) if val > 0]
            negative_contribs = [(i, val) for i, val in enumerate(shap_values) if val < 0]
            
            positive_contribs.sort(key=lambda x: x[1], reverse=True)
            negative_contribs.sort(key=lambda x: x[1])
            
            viz_data['positive_contributors'] = positive_contribs[:10]  # Top 10
            viz_data['negative_contributors'] = negative_contribs[:10]  # Bottom 10
        
        return viz_data
    
    def get_global_importance(self, sample_size: int = 1000) -> Dict[str, float]:
        """
        Calculate global feature importance using background data.
        
        Args:
            sample_size: Number of samples to use for global importance
            
        Returns:
            Dictionary of global feature importance scores
        """
        try:
            # Sample from background data if it's too large
            if len(self.background_data) > sample_size:
                indices = np.random.choice(len(self.background_data), sample_size, replace=False)
                sample_data = self.background_data[indices]
            else:
                sample_data = self.background_data
            
            # Get SHAP values for sample
            shap_values = self.explainer.shap_values(sample_data)
            
            if isinstance(shap_values, list):
                # Multi-class case - average across classes
                shap_values = np.mean(shap_values, axis=0)
            
            # Calculate mean absolute SHAP values
            global_importance = np.mean(np.abs(shap_values), axis=0)
            
            return dict(zip(self.feature_names, global_importance))
            
        except Exception as e:
            logger.error(f"Error calculating global importance: {str(e)}")
            return {name: 0.0 for name in self.feature_names}
    
    def generate_cache_key(self, instance: np.ndarray) -> str:
        """
        Generate cache key for explanation caching.
        
        Args:
            instance: Input instance
            
        Returns:
            Hash-based cache key
        """
        # Create hash from model version, instance, and explainer type
        instance_str = str(instance.tolist())
        model_id = getattr(self.model, '__class__', 'unknown').__name__
        
        key_data = f"shap_{model_id}_{instance_str}"
        return hashlib.md5(key_data.encode()).hexdigest()
