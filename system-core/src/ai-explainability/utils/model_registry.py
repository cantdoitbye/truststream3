"""
Model Registry for TrustStram v4.4 AI Explainability

Manages model loading, metadata, and versioning for explanation services.
"""

import asyncio
import json
import logging
import pickle
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Union

import joblib
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

class ModelRegistry:
    """
    Registry for managing models available for explanation.
    """
    
    def __init__(self, models_directory: str = "models"):
        """
        Initialize model registry.
        
        Args:
            models_directory: Directory containing model files
        """
        self.models_directory = Path(models_directory)
        self.models = {}  # model_id -> model_info
        self.model_metadata = {}  # model_id -> metadata
        
        # Ensure models directory exists
        self.models_directory.mkdir(exist_ok=True)
        
        logger.info(f"Model registry initialized with directory: {self.models_directory}")
    
    async def load_models(self) -> None:
        """
        Load all available models from the models directory.
        """
        try:
            model_files = list(self.models_directory.glob("*.pkl")) + \
                         list(self.models_directory.glob("*.joblib"))
            
            for model_file in model_files:
                try:
                    await self.load_model_from_file(model_file)
                except Exception as e:
                    logger.warning(f"Failed to load model {model_file}: {str(e)}")
            
            logger.info(f"Loaded {len(self.models)} models")
            
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
            raise
    
    async def load_model_from_file(self, model_path: Union[str, Path]) -> str:
        """
        Load a single model from file.
        
        Args:
            model_path: Path to model file
            
        Returns:
            Model ID
        """
        model_path = Path(model_path)
        model_id = model_path.stem
        
        try:
            # Load model
            if model_path.suffix == '.pkl':
                with open(model_path, 'rb') as f:
                    model = pickle.load(f)
            elif model_path.suffix == '.joblib':
                model = joblib.load(model_path)
            else:
                raise ValueError(f"Unsupported model format: {model_path.suffix}")
            
            # Load metadata if available
            metadata_path = model_path.parent / f"{model_id}_metadata.json"
            if metadata_path.exists():
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
            else:
                metadata = await self._generate_default_metadata(model, model_id)
            
            # Store model and metadata
            self.models[model_id] = {
                'model': model,
                'file_path': str(model_path),
                'loaded_at': datetime.now().isoformat(),
                **metadata
            }
            
            self.model_metadata[model_id] = metadata
            
            logger.info(f"Loaded model: {model_id}")
            return model_id
            
        except Exception as e:
            logger.error(f"Error loading model from {model_path}: {str(e)}")
            raise
    
    async def register_model(
        self,
        model_id: str,
        model: Any,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Register a model programmatically.
        
        Args:
            model_id: Unique identifier for the model
            model: The model object
            metadata: Optional metadata for the model
        """
        try:
            if metadata is None:
                metadata = await self._generate_default_metadata(model, model_id)
            
            self.models[model_id] = {
                'model': model,
                'file_path': None,
                'loaded_at': datetime.now().isoformat(),
                **metadata
            }
            
            self.model_metadata[model_id] = metadata
            
            logger.info(f"Registered model: {model_id}")
            
        except Exception as e:
            logger.error(f"Error registering model {model_id}: {str(e)}")
            raise
    
    async def get_model(self, model_id: str) -> Optional[Dict[str, Any]]:
        """
        Get model and its metadata.
        
        Args:
            model_id: Model identifier
            
        Returns:
            Model information dictionary or None if not found
        """
        return self.models.get(model_id)
    
    async def list_models(self) -> List[Dict[str, Any]]:
        """
        List all available models with their metadata.
        
        Returns:
            List of model information dictionaries
        """
        model_list = []
        
        for model_id, model_info in self.models.items():
            model_summary = {
                'model_id': model_id,
                'model_type': model_info.get('model_type', 'unknown'),
                'task_type': model_info.get('task_type', 'unknown'),
                'feature_count': model_info.get('feature_count', 0),
                'loaded_at': model_info.get('loaded_at'),
                'description': model_info.get('description', ''),
                'explainability_methods': model_info.get('explainability_methods', []),
                'performance_metrics': model_info.get('performance_metrics', {})
            }
            model_list.append(model_summary)
        
        return model_list
    
    async def remove_model(self, model_id: str) -> bool:
        """
        Remove a model from the registry.
        
        Args:
            model_id: Model identifier
            
        Returns:
            True if model was removed, False if not found
        """
        if model_id in self.models:
            del self.models[model_id]
            if model_id in self.model_metadata:
                del self.model_metadata[model_id]
            
            logger.info(f"Removed model: {model_id}")
            return True
        
        return False
    
    async def update_model_metadata(
        self,
        model_id: str,
        metadata_updates: Dict[str, Any]
    ) -> bool:
        """
        Update metadata for a model.
        
        Args:
            model_id: Model identifier
            metadata_updates: Dictionary of metadata updates
            
        Returns:
            True if updated successfully, False if model not found
        """
        if model_id not in self.models:
            return False
        
        # Update both storage locations
        self.models[model_id].update(metadata_updates)
        self.model_metadata[model_id].update(metadata_updates)
        
        # Update timestamp
        self.models[model_id]['updated_at'] = datetime.now().isoformat()
        
        logger.info(f"Updated metadata for model: {model_id}")
        return True
    
    async def _generate_default_metadata(
        self,
        model: Any,
        model_id: str
    ) -> Dict[str, Any]:
        """
        Generate default metadata for a model.
        
        Args:
            model: The model object
            model_id: Model identifier
            
        Returns:
            Default metadata dictionary
        """
        metadata = {
            'model_id': model_id,
            'model_type': model.__class__.__name__,
            'created_at': datetime.now().isoformat(),
            'description': f"Auto-generated metadata for {model_id}",
            'version': '1.0.0'
        }
        
        # Detect task type
        if hasattr(model, 'predict_proba'):
            metadata['task_type'] = 'classification'
        elif hasattr(model, 'predict'):
            metadata['task_type'] = 'regression'
        else:
            metadata['task_type'] = 'unknown'
        
        # Feature information
        if hasattr(model, 'n_features_in_'):
            metadata['feature_count'] = int(model.n_features_in_)
        elif hasattr(model, 'coef_'):
            if model.coef_.ndim == 1:
                metadata['feature_count'] = len(model.coef_)
            else:
                metadata['feature_count'] = model.coef_.shape[1]
        else:
            metadata['feature_count'] = 0
        
        # Feature names if available
        if hasattr(model, 'feature_names_in_'):
            metadata['feature_names'] = list(model.feature_names_in_)
        else:
            if metadata['feature_count'] > 0:
                metadata['feature_names'] = [f"feature_{i}" for i in range(metadata['feature_count'])]
            else:
                metadata['feature_names'] = []
        
        # Explainability method compatibility
        explainability_methods = []
        
        # Check for tree-based models (SHAP TreeExplainer)
        model_name = model.__class__.__name__.lower()
        if any(tree_name in model_name for tree_name in 
               ['tree', 'forest', 'xgb', 'lgb', 'catboost', 'gradient']):
            explainability_methods.extend(['shap_tree', 'interpretml'])
        
        # Check for linear models (SHAP LinearExplainer)
        if any(linear_name in model_name for linear_name in 
               ['linear', 'logistic', 'ridge', 'lasso', 'elastic']):
            explainability_methods.extend(['shap_linear', 'interpretml'])
        
        # All models can use kernel explainer and counterfactuals
        explainability_methods.extend(['shap_kernel', 'hag_xai', 'counterfactual'])
        
        metadata['explainability_methods'] = list(set(explainability_methods))
        
        # Performance metrics placeholder
        metadata['performance_metrics'] = {}
        
        # Model complexity indicators
        metadata['complexity_indicators'] = await self._assess_model_complexity(model)
        
        return metadata
    
    async def _assess_model_complexity(self, model: Any) -> Dict[str, Any]:
        """
        Assess model complexity for explanation guidance.
        
        Args:
            model: The model object
            
        Returns:
            Complexity indicators dictionary
        """
        complexity = {
            'interpretability': 'medium',  # low, medium, high
            'explanation_speed': 'medium',  # slow, medium, fast
            'supports_global_explanation': True,
            'supports_local_explanation': True
        }
        
        model_name = model.__class__.__name__.lower()
        
        # High interpretability models
        if any(interpretable in model_name for interpretable in 
               ['linear', 'logistic', 'tree', 'naive']):
            complexity['interpretability'] = 'high'
            complexity['explanation_speed'] = 'fast'
        
        # Low interpretability models
        elif any(complex_model in model_name for complex_model in 
                ['neural', 'mlp', 'deep', 'ensemble', 'voting']):
            complexity['interpretability'] = 'low'
            complexity['explanation_speed'] = 'slow'
        
        # Tree-based models have fast SHAP explanations
        if any(tree_name in model_name for tree_name in 
               ['tree', 'forest', 'xgb', 'lgb', 'catboost']):
            complexity['explanation_speed'] = 'fast'
        
        # Check for feature importance availability
        if hasattr(model, 'feature_importances_'):
            complexity['has_built_in_importance'] = True
        else:
            complexity['has_built_in_importance'] = False
        
        return complexity
    
    async def save_model(
        self,
        model_id: str,
        file_path: Optional[str] = None
    ) -> str:
        """
        Save a model to disk.
        
        Args:
            model_id: Model identifier
            file_path: Optional custom file path
            
        Returns:
            Path where model was saved
        """
        if model_id not in self.models:
            raise ValueError(f"Model {model_id} not found in registry")
        
        model_info = self.models[model_id]
        model = model_info['model']
        
        # Determine save path
        if file_path is None:
            file_path = self.models_directory / f"{model_id}.joblib"
        else:
            file_path = Path(file_path)
        
        try:
            # Save model
            joblib.dump(model, file_path)
            
            # Save metadata
            metadata_path = file_path.parent / f"{file_path.stem}_metadata.json"
            metadata = {k: v for k, v in model_info.items() if k != 'model'}
            
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2, default=str)
            
            # Update model info with file path
            self.models[model_id]['file_path'] = str(file_path)
            
            logger.info(f"Saved model {model_id} to {file_path}")
            return str(file_path)
            
        except Exception as e:
            logger.error(f"Error saving model {model_id}: {str(e)}")
            raise
    
    async def get_model_recommendations(
        self,
        model_id: str
    ) -> Dict[str, Any]:
        """
        Get recommendations for explaining a specific model.
        
        Args:
            model_id: Model identifier
            
        Returns:
            Recommendations dictionary
        """
        if model_id not in self.models:
            return {'error': f'Model {model_id} not found'}
        
        model_info = self.models[model_id]
        complexity = model_info.get('complexity_indicators', {})
        
        recommendations = {
            'recommended_methods': [],
            'performance_expectations': {},
            'best_practices': []
        }
        
        # Method recommendations based on model type
        explainability_methods = model_info.get('explainability_methods', [])
        
        if 'shap_tree' in explainability_methods:
            recommendations['recommended_methods'].append({
                'method': 'shap',
                'priority': 'high',
                'reason': 'Fast and accurate for tree-based models'
            })
        
        if 'shap_linear' in explainability_methods:
            recommendations['recommended_methods'].append({
                'method': 'shap',
                'priority': 'high',
                'reason': 'Exact explanations for linear models'
            })
        
        recommendations['recommended_methods'].append({
            'method': 'interpretml',
            'priority': 'medium',
            'reason': 'Unified interface for multiple explanation methods'
        })
        
        recommendations['recommended_methods'].append({
            'method': 'hag_xai',
            'priority': 'medium',
            'reason': 'Human attention guided explanations for trust building'
        })
        
        recommendations['recommended_methods'].append({
            'method': 'counterfactual',
            'priority': 'low',
            'reason': 'Actionable what-if scenarios'
        })
        
        # Performance expectations
        explanation_speed = complexity.get('explanation_speed', 'medium')
        if explanation_speed == 'fast':
            recommendations['performance_expectations'] = {
                'shap_local': '< 100ms',
                'shap_global': '< 5s',
                'interpretml': '< 500ms',
                'hag_xai': '< 1s',
                'counterfactual': '< 10s'
            }
        elif explanation_speed == 'slow':
            recommendations['performance_expectations'] = {
                'shap_local': '< 2s',
                'shap_global': '< 30s',
                'interpretml': '< 5s',
                'hag_xai': '< 10s',
                'counterfactual': '< 60s'
            }
        else:  # medium
            recommendations['performance_expectations'] = {
                'shap_local': '< 500ms',
                'shap_global': '< 15s',
                'interpretml': '< 2s',
                'hag_xai': '< 5s',
                'counterfactual': '< 30s'
            }
        
        # Best practices
        interpretability = complexity.get('interpretability', 'medium')
        if interpretability == 'low':
            recommendations['best_practices'].extend([
                'Use multiple explanation methods for validation',
                'Focus on local explanations for individual predictions',
                'Consider model-agnostic methods like LIME or SHAP Kernel'
            ])
        elif interpretability == 'high':
            recommendations['best_practices'].extend([
                'Leverage built-in model interpretability',
                'Use global explanations to understand overall behavior',
                'Fast explanation methods are available'
            ])
        
        return recommendations
