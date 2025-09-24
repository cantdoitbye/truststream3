"""InterpretML framework integration for TrustStram v4.4

Provides unified API for glass-box and black-box explanations
with rich visualizations and EBM support.
"""

from interpret import set_visualize_provider
from interpret.provider import InlineProvider
from interpret.blackbox import LimeTabular, ShapKernel
from interpret.glassbox import ExplainableBoostingClassifier, ExplainableBoostingRegressor
from interpret.perf import ROC, PR
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional, Union, List, Tuple
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class InterpretMLFramework:
    """Unified InterpretML framework for glass-box and black-box explanations."""
    
    def __init__(self, visualization_provider: str = 'inline'):
        """
        Initialize InterpretML framework.
        
        Args:
            visualization_provider: Visualization provider type
        """
        if visualization_provider == 'inline':
            set_visualize_provider(InlineProvider())
        
        self.explainers = {}
        self.models = {}
        
        logger.info("InterpretML framework initialized")
    
    def create_glass_box_model(self, 
                             X: Union[np.ndarray, pd.DataFrame], 
                             y: Union[np.ndarray, pd.Series],
                             model_type: str = 'classifier',
                             **kwargs) -> Tuple[Any, Any]:
        """
        Create and train a glass-box (inherently interpretable) model.
        
        Args:
            X: Training features
            y: Training targets
            model_type: 'classifier' or 'regressor'
            **kwargs: Additional model parameters
            
        Returns:
            Tuple of (trained_model, global_explanation)
        """
        try:
            if model_type == 'classifier':
                model = ExplainableBoostingClassifier(**kwargs)
            elif model_type == 'regressor':
                model = ExplainableBoostingRegressor(**kwargs)
            else:
                raise ValueError(f"Unsupported model type: {model_type}")
            
            # Train model
            model.fit(X, y)
            
            # Generate global explanation
            global_explanation = model.explain_global()
            
            # Store model
            model_id = f"ebm_{model_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            self.models[model_id] = model
            
            logger.info(f"Glass-box model created: {model_id}")
            
            return model, global_explanation
            
        except Exception as e:
            logger.error(f"Error creating glass-box model: {str(e)}")
            raise
    
    def create_black_box_explainer(self,
                                 model: Any,
                                 X_train: Union[np.ndarray, pd.DataFrame],
                                 method: str = 'shap',
                                 **kwargs) -> Any:
        """
        Create black-box explainer for any model.
        
        Args:
            model: Trained model to explain
            X_train: Training data for explainer initialization
            method: Explanation method ('shap', 'lime')
            **kwargs: Additional explainer parameters
            
        Returns:
            Configured explainer
        """
        try:
            if method == 'shap':
                explainer = ShapKernel(
                    model.predict_proba if hasattr(model, 'predict_proba') else model.predict,
                    X_train,
                    **kwargs
                )
            elif method == 'lime':
                explainer = LimeTabular(
                    model.predict_proba if hasattr(model, 'predict_proba') else model.predict,
                    X_train,
                    **kwargs
                )
            else:
                raise ValueError(f"Unsupported explanation method: {method}")
            
            # Store explainer
            explainer_id = f"{method}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            self.explainers[explainer_id] = explainer
            
            logger.info(f"Black-box explainer created: {explainer_id}")
            
            return explainer
            
        except Exception as e:
            logger.error(f"Error creating black-box explainer: {str(e)}")
            raise
    
    def explain_local(self,
                     explainer: Any,
                     instance: Union[np.ndarray, pd.Series],
                     **kwargs) -> Dict[str, Any]:
        """
        Generate local explanation for a single instance.
        
        Args:
            explainer: Configured explainer
            instance: Instance to explain
            **kwargs: Additional explanation parameters
            
        Returns:
            Local explanation dictionary
        """
        try:
            # Generate explanation
            explanation = explainer.explain_local(instance, **kwargs)
            
            # Extract explanation data
            explanation_data = {
                'timestamp': datetime.now().isoformat(),
                'explainer_type': 'interpret_ml',
                'explanation_object': explanation,
                'method': getattr(explainer, '__class__', 'unknown').__name__
            }
            
            # Try to extract numerical data if available
            try:
                if hasattr(explanation, 'data'):
                    if hasattr(explanation.data(), 'scores'):
                        explanation_data['scores'] = explanation.data()['scores']
                    if hasattr(explanation.data(), 'names'):
                        explanation_data['feature_names'] = explanation.data()['names']
                    if hasattr(explanation.data(), 'values'):
                        explanation_data['feature_values'] = explanation.data()['values']
            except Exception:
                pass  # Not all explainers have extractable data
            
            return explanation_data
            
        except Exception as e:
            logger.error(f"Error generating local explanation: {str(e)}")
            return {
                'error': str(e),
                'explainer_type': 'interpret_ml',
                'timestamp': datetime.now().isoformat()
            }
    
    def explain_global(self, model_or_explainer: Any, **kwargs) -> Dict[str, Any]:
        """
        Generate global explanation for a model.
        
        Args:
            model_or_explainer: Model or explainer to generate global explanation
            **kwargs: Additional explanation parameters
            
        Returns:
            Global explanation dictionary
        """
        try:
            # Check if it's a glass-box model with built-in global explanations
            if hasattr(model_or_explainer, 'explain_global'):
                explanation = model_or_explainer.explain_global(**kwargs)
            else:
                # For black-box explainers, global explanation might not be available
                explanation = None
            
            explanation_data = {
                'timestamp': datetime.now().isoformat(),
                'explainer_type': 'interpret_ml_global',
                'explanation_object': explanation,
                'method': getattr(model_or_explainer, '__class__', 'unknown').__name__
            }
            
            # Try to extract global importance if available
            try:
                if explanation and hasattr(explanation, 'data'):
                    data = explanation.data()
                    if 'scores' in data and 'names' in data:
                        explanation_data['global_importance'] = dict(zip(data['names'], data['scores']))
            except Exception:
                pass
            
            return explanation_data
            
        except Exception as e:
            logger.error(f"Error generating global explanation: {str(e)}")
            return {
                'error': str(e),
                'explainer_type': 'interpret_ml_global',
                'timestamp': datetime.now().isoformat()
            }
    
    def evaluate_model_performance(self,
                                 model: Any,
                                 X_test: Union[np.ndarray, pd.DataFrame],
                                 y_test: Union[np.ndarray, pd.Series],
                                 model_type: str = 'classifier') -> Dict[str, Any]:
        """
        Evaluate model performance with interpretable metrics.
        
        Args:
            model: Trained model
            X_test: Test features
            y_test: Test targets
            model_type: 'classifier' or 'regressor'
            
        Returns:
            Performance evaluation dictionary
        """
        try:
            # Generate predictions
            if model_type == 'classifier':
                if hasattr(model, 'predict_proba'):
                    y_pred_proba = model.predict_proba(X_test)
                    y_pred = model.predict(X_test)
                    
                    # ROC and PR curves
                    roc_explanation = ROC().explain_perf(y_test, y_pred_proba)
                    pr_explanation = PR().explain_perf(y_test, y_pred_proba)
                    
                    performance_data = {
                        'model_type': 'classifier',
                        'roc_explanation': roc_explanation,
                        'pr_explanation': pr_explanation,
                        'predictions': y_pred.tolist(),
                        'probabilities': y_pred_proba.tolist()
                    }
                else:
                    y_pred = model.predict(X_test)
                    performance_data = {
                        'model_type': 'classifier',
                        'predictions': y_pred.tolist()
                    }
            else:
                y_pred = model.predict(X_test)
                performance_data = {
                    'model_type': 'regressor',
                    'predictions': y_pred.tolist()
                }
            
            performance_data.update({
                'timestamp': datetime.now().isoformat(),
                'test_size': len(X_test)
            })
            
            return performance_data
            
        except Exception as e:
            logger.error(f"Error evaluating model performance: {str(e)}")
            return {
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def get_model_summary(self, model_id: str) -> Dict[str, Any]:
        """
        Get summary information about a stored model.
        
        Args:
            model_id: ID of stored model
            
        Returns:
            Model summary dictionary
        """
        if model_id not in self.models:
            return {'error': f'Model {model_id} not found'}
        
        model = self.models[model_id]
        
        summary = {
            'model_id': model_id,
            'model_type': model.__class__.__name__,
            'timestamp': datetime.now().isoformat()
        }
        
        # Add model-specific information
        try:
            if hasattr(model, 'feature_names_in_'):
                summary['feature_names'] = model.feature_names_in_.tolist()
            if hasattr(model, 'n_features_in_'):
                summary['n_features'] = model.n_features_in_
            if hasattr(model, 'classes_'):
                summary['classes'] = model.classes_.tolist()
        except Exception:
            pass
        
        return summary
    
    def list_models(self) -> List[str]:
        """List all stored model IDs."""
        return list(self.models.keys())
    
    def list_explainers(self) -> List[str]:
        """List all stored explainer IDs."""
        return list(self.explainers.keys())
