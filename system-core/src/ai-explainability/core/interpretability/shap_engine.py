"""
Advanced SHAP (SHapley Additive exPlanations) Engine for TrustStram v4.4

Provides comprehensive SHAP-based explanations with performance optimization,
uncertainty quantification, and stakeholder-specific formatting.
"""

import asyncio
import logging
import time
from typing import Dict, List, Any, Optional, Union, Tuple

import numpy as np
import pandas as pd
from datetime import datetime

# SHAP imports
try:
    import shap
    shap.initjs()  # Initialize JavaScript visualization
except ImportError:
    logging.warning("SHAP not available. Install with: pip install shap")
    shap = None

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

class SHAPEngine:
    """
    Advanced SHAP explanation engine with optimized performance,
    uncertainty quantification, and comprehensive explanation generation.
    """
    
    def __init__(self):
        """
        Initialize SHAP engine with explainer cache and performance optimization.
        """
        self.explainer_cache = {}
        self.background_data_cache = {}
        self.feature_names_cache = {}
        
        if shap is None:
            raise ImportError("SHAP library is required but not installed")
        
        logger.info("SHAP Engine initialized")
    
    async def explain_instance(
        self, 
        model: Any, 
        instance: Union[pd.DataFrame, np.ndarray],
        feature_names: Optional[List[str]] = None,
        background_data: Optional[Union[pd.DataFrame, np.ndarray]] = None,
        explainer_type: str = 'auto',
        include_uncertainty: bool = False,
        n_samples: int = 100
    ) -> Dict[str, Any]:
        """
        Generate SHAP explanation for a single instance.
        
        Args:
            model: Trained model to explain
            instance: Instance to explain
            feature_names: Names of features
            background_data: Background data for explainer
            explainer_type: Type of SHAP explainer ('auto', 'tree', 'kernel', 'linear')
            include_uncertainty: Whether to include uncertainty measures
            n_samples: Number of samples for kernel explainer
            
        Returns:
            Dictionary containing SHAP explanation data
        """
        start_time = time.time()
        
        try:
            # Convert instance to numpy array if needed
            if isinstance(instance, pd.DataFrame):
                instance_array = instance.values
                if feature_names is None:
                    feature_names = list(instance.columns)
            else:
                instance_array = np.array(instance).reshape(1, -1)
            
            # Get or create explainer
            explainer = await self._get_or_create_explainer(
                model, background_data, explainer_type, feature_names
            )
            
            # Calculate SHAP values
            shap_values = explainer.shap_values(instance_array)
            
            # Handle multi-class case
            if isinstance(shap_values, list):
                # For multi-class, use the class with highest prediction
                prediction = model.predict_proba(instance_array)[0]
                predicted_class = np.argmax(prediction)
                shap_values_selected = shap_values[predicted_class]
            else:
                shap_values_selected = shap_values[0] if shap_values.ndim > 1 else shap_values
            
            # Get expected value
            expected_value = explainer.expected_value
            if isinstance(expected_value, (list, np.ndarray)):
                expected_value = expected_value[predicted_class] if 'predicted_class' in locals() else expected_value[0]
            
            # Calculate feature importance
            feature_importance = await self._calculate_feature_importance(
                shap_values_selected, feature_names
            )
            
            # Generate natural language summary
            natural_language_summary = await self._generate_natural_language_summary(
                feature_importance, instance, feature_names
            )
            
            # Calculate uncertainty if requested
            uncertainty_measures = {}
            if include_uncertainty:
                uncertainty_measures = await self._calculate_uncertainty(
                    model, instance_array, explainer, n_samples
                )
            
            # Generate visualization data
            visualization_data = await self._generate_visualization_data(
                shap_values_selected, feature_names, expected_value
            )
            
            # Calculate confidence metrics
            confidence_metrics = await self._calculate_confidence_metrics(
                shap_values_selected, feature_importance
            )
            
            explanation_data = {
                'shap_values': shap_values_selected.tolist(),
                'expected_value': float(expected_value),
                'feature_importance': feature_importance,
                'feature_names': feature_names,
                'natural_language_summary': natural_language_summary,
                'uncertainty_measures': uncertainty_measures,
                'visualization_data': visualization_data,
                'confidence_metrics': confidence_metrics,
                'explanation_metadata': {
                    'explainer_type': explainer_type,
                    'generation_time_ms': (time.time() - start_time) * 1000,
                    'timestamp': datetime.now().isoformat(),
                    'shap_version': shap.__version__
                }
            }
            
            logger.info(f"SHAP explanation generated in {(time.time() - start_time)*1000:.2f}ms")
            return explanation_data
            
        except Exception as e:
            logger.error(f"Error generating SHAP explanation: {str(e)}")
            raise
    
    async def _get_or_create_explainer(
        self,
        model: Any,
        background_data: Optional[Union[pd.DataFrame, np.ndarray]],
        explainer_type: str,
        feature_names: Optional[List[str]]
    ) -> Any:
        """
        Get cached explainer or create new one.
        """
        # Create cache key
        model_id = id(model)
        cache_key = f"{model_id}_{explainer_type}"
        
        if cache_key in self.explainer_cache:
            return self.explainer_cache[cache_key]
        
        # Create new explainer
        if explainer_type == 'auto':
            explainer_type = self._determine_best_explainer(model)
        
        if explainer_type == 'tree' and hasattr(model, 'tree_'):
            explainer = shap.TreeExplainer(model)
            
        elif explainer_type == 'linear' and hasattr(model, 'coef_'):
            explainer = shap.LinearExplainer(model, background_data)
            
        elif explainer_type == 'kernel':
            if background_data is None:
                # Create synthetic background data
                background_data = self._create_synthetic_background(model)
            
            explainer = shap.KernelExplainer(model.predict, background_data)
            
        else:
            # Default to kernel explainer
            if background_data is None:
                background_data = self._create_synthetic_background(model)
            
            explainer = shap.KernelExplainer(model.predict, background_data)
        
        # Cache explainer
        self.explainer_cache[cache_key] = explainer
        
        return explainer
    
    def _determine_best_explainer(self, model: Any) -> str:
        """
        Determine the best SHAP explainer for the given model.
        """
        model_name = model.__class__.__name__.lower()
        
        # Tree-based models
        if any(tree_name in model_name for tree_name in 
               ['tree', 'forest', 'xgb', 'lgb', 'catboost', 'gradient']):
            return 'tree'
        
        # Linear models
        elif any(linear_name in model_name for linear_name in 
                ['linear', 'logistic', 'ridge', 'lasso', 'elastic']):
            return 'linear'
        
        # Default to kernel
        else:
            return 'kernel'
    
    def _create_synthetic_background(self, model: Any, n_samples: int = 100) -> np.ndarray:
        """
        Create synthetic background data when none is provided.
        """
        # This is a placeholder - in production, you'd use domain knowledge
        # or training data to create meaningful background
        if hasattr(model, 'feature_importances_'):
            n_features = len(model.feature_importances_)
        elif hasattr(model, 'coef_'):
            n_features = model.coef_.shape[-1]
        else:
            n_features = 10  # Default assumption
        
        return np.random.randn(n_samples, n_features)
    
    async def _calculate_feature_importance(
        self,
        shap_values: np.ndarray,
        feature_names: Optional[List[str]]
    ) -> Dict[str, float]:
        """
        Calculate feature importance from SHAP values.
        """
        importance_scores = np.abs(shap_values)
        
        if feature_names is None:
            feature_names = [f"feature_{i}" for i in range(len(importance_scores))]
        
        feature_importance = {
            name: float(score) 
            for name, score in zip(feature_names, importance_scores)
        }
        
        # Sort by importance
        return dict(sorted(feature_importance.items(), key=lambda x: x[1], reverse=True))
    
    async def _generate_natural_language_summary(
        self,
        feature_importance: Dict[str, float],
        instance: Union[pd.DataFrame, np.ndarray],
        feature_names: Optional[List[str]]
    ) -> str:
        """
        Generate natural language summary of the explanation.
        """
        top_features = list(feature_importance.keys())[:3]
        
        if len(top_features) == 0:
            return "No significant features identified in this prediction."
        
        summary_parts = []
        summary_parts.append(f"The most important factor in this prediction is {top_features[0]}.")
        
        if len(top_features) > 1:
            summary_parts.append(f"Other significant factors include {top_features[1]}")
            if len(top_features) > 2:
                summary_parts[-1] += f" and {top_features[2]}."
            else:
                summary_parts[-1] += "."
        
        return " ".join(summary_parts)
    
    async def _calculate_uncertainty(
        self,
        model: Any,
        instance: np.ndarray,
        explainer: Any,
        n_samples: int
    ) -> Dict[str, float]:
        """
        Calculate uncertainty measures for the explanation.
        """
        try:
            # Generate multiple explanations with noise
            shap_values_samples = []
            
            for _ in range(min(n_samples, 50)):
                # Add small amount of noise
                noisy_instance = instance + np.random.normal(0, 0.01, instance.shape)
                shap_vals = explainer.shap_values(noisy_instance)
                
                if isinstance(shap_vals, list):
                    shap_vals = shap_vals[0]
                
                shap_values_samples.append(shap_vals[0] if shap_vals.ndim > 1 else shap_vals)
            
            shap_values_array = np.array(shap_values_samples)
            
            return {
                'explanation_variance': float(np.mean(np.var(shap_values_array, axis=0))),
                'explanation_std': float(np.mean(np.std(shap_values_array, axis=0))),
                'confidence_interval_95': {
                    'lower': float(np.percentile(shap_values_array, 2.5)),
                    'upper': float(np.percentile(shap_values_array, 97.5))
                }
            }
            
        except Exception as e:
            logger.warning(f"Could not calculate uncertainty: {str(e)}")
            return {}
    
    async def _generate_visualization_data(
        self,
        shap_values: np.ndarray,
        feature_names: Optional[List[str]],
        expected_value: float
    ) -> Dict[str, Any]:
        """
        Generate data for SHAP visualizations.
        """
        if feature_names is None:
            feature_names = [f"feature_{i}" for i in range(len(shap_values))]
        
        return {
            'waterfall_data': {
                'features': feature_names,
                'values': shap_values.tolist(),
                'expected_value': expected_value
            },
            'force_plot_data': {
                'base_value': expected_value,
                'shap_values': shap_values.tolist(),
                'feature_names': feature_names
            },
            'summary_plot_data': {
                'feature_importance': {name: abs(val) for name, val in zip(feature_names, shap_values)}
            }
        }
    
    async def _calculate_confidence_metrics(
        self,
        shap_values: np.ndarray,
        feature_importance: Dict[str, float]
    ) -> Dict[str, float]:
        """
        Calculate confidence metrics for the explanation.
        """
        total_importance = sum(abs(val) for val in shap_values)
        max_importance = max(abs(val) for val in shap_values) if len(shap_values) > 0 else 0
        
        return {
            'total_attribution': float(total_importance),
            'max_feature_importance': float(max_importance),
            'importance_concentration': float(max_importance / total_importance) if total_importance > 0 else 0,
            'explanation_complexity': len([val for val in shap_values if abs(val) > 0.01])
        }
    
    async def explain_global(
        self,
        model: Any,
        X: Union[pd.DataFrame, np.ndarray],
        feature_names: Optional[List[str]] = None,
        max_samples: int = 1000
    ) -> Dict[str, Any]:
        """
        Generate global SHAP explanation for the entire dataset.
        """
        try:
            # Sample data if too large
            if len(X) > max_samples:
                if isinstance(X, pd.DataFrame):
                    X_sample = X.sample(n=max_samples, random_state=42)
                else:
                    indices = np.random.choice(len(X), max_samples, replace=False)
                    X_sample = X[indices]
            else:
                X_sample = X
            
            # Get explainer
            explainer = await self._get_or_create_explainer(
                model, X_sample, 'auto', feature_names
            )
            
            # Calculate SHAP values for sample
            shap_values = explainer.shap_values(X_sample)
            
            if isinstance(shap_values, list):
                shap_values = shap_values[0]  # Use first class for multi-class
            
            # Calculate global feature importance
            global_importance = np.mean(np.abs(shap_values), axis=0)
            
            if feature_names is None:
                feature_names = [f"feature_{i}" for i in range(len(global_importance))]
            
            feature_importance_dict = {
                name: float(importance)
                for name, importance in zip(feature_names, global_importance)
            }
            
            # Sort by importance
            feature_importance_dict = dict(sorted(
                feature_importance_dict.items(), 
                key=lambda x: x[1], 
                reverse=True
            ))
            
            return {
                'global_feature_importance': feature_importance_dict,
                'shap_values_summary': {
                    'mean_abs_shap': float(np.mean(np.abs(shap_values))),
                    'std_abs_shap': float(np.std(np.abs(shap_values))),
                    'max_abs_shap': float(np.max(np.abs(shap_values)))
                },
                'feature_interactions': await self._analyze_feature_interactions(shap_values, feature_names),
                'samples_analyzed': len(X_sample)
            }
            
        except Exception as e:
            logger.error(f"Error generating global SHAP explanation: {str(e)}")
            raise
    
    async def _analyze_feature_interactions(
        self,
        shap_values: np.ndarray,
        feature_names: Optional[List[str]]
    ) -> Dict[str, Any]:
        """
        Analyze feature interactions from SHAP values.
        """
        try:
            # Calculate correlation between SHAP values
            shap_corr = np.corrcoef(shap_values.T)
            
            if feature_names is None:
                feature_names = [f"feature_{i}" for i in range(shap_values.shape[1])]
            
            # Find strongest interactions
            interactions = []
            for i in range(len(feature_names)):
                for j in range(i+1, len(feature_names)):
                    correlation = shap_corr[i, j]
                    if abs(correlation) > 0.3:  # Threshold for significant interaction
                        interactions.append({
                            'feature_1': feature_names[i],
                            'feature_2': feature_names[j],
                            'correlation': float(correlation)
                        })
            
            # Sort by absolute correlation
            interactions.sort(key=lambda x: abs(x['correlation']), reverse=True)
            
            return {
                'significant_interactions': interactions[:10],  # Top 10
                'interaction_strength': 'high' if len(interactions) > 5 else 'moderate' if len(interactions) > 2 else 'low'
            }
            
        except Exception as e:
            logger.warning(f"Could not analyze feature interactions: {str(e)}")
            return {'significant_interactions': [], 'interaction_strength': 'unknown'}
