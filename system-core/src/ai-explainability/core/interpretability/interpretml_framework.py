"""
InterpretML integration framework for TrustStram v4.4

Provides unified API for glass-box and black-box model interpretability
with rich visualizations and comprehensive explanation capabilities.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
import logging

# InterpretML imports
try:
    from interpret import set_visualize_provider
    from interpret.provider import InlineProvider
    from interpret.blackbox import LimeTabular, ShapKernel
    from interpret.glassbox import ExplainableBoostingClassifier, ExplainableBoostingRegressor
    from interpret import show
except ImportError:
    logging.warning("InterpretML not available. Install with: pip install interpret")
    
logger = logging.getLogger(__name__)

class TrustStramInterpretMLFramework:
    """
    Unified InterpretML framework providing consistent interface across
    different explanation methods and model types.
    
    Supports both glass-box (inherently interpretable) and black-box
    (post-hoc explanation) approaches.
    """
    
    def __init__(self, visualization_provider: str = 'inline'):
        """
        Initialize InterpretML framework.
        
        Args:
            visualization_provider: Provider for visualizations ('inline', 'azure')
        """
        try:
            if visualization_provider == 'inline':
                set_visualize_provider(InlineProvider())
            
            self.explainers = {}
            self.glass_box_models = {}
            self.explanations = {}
            
            logger.info("Initialized InterpretML framework")
            
        except Exception as e:
            logger.error(f"Failed to initialize InterpretML: {str(e)}")
            raise
    
    def create_glass_box_model(self, X: pd.DataFrame, y: Union[pd.Series, np.ndarray], 
                              model_type: str = 'classifier', 
                              model_name: str = 'default') -> Dict[str, Any]:
        """
        Create and train an inherently interpretable glass-box model.
        
        Args:
            X: Training features
            y: Training targets
            model_type: Type of model ('classifier', 'regressor')
            model_name: Name identifier for the model
            
        Returns:
            Dictionary containing model and global explanation
        """
        try:
            # Select appropriate glass-box model
            if model_type == 'classifier':
                model = ExplainableBoostingClassifier(
                    random_state=42,
                    n_jobs=-1,
                    interactions=10,  # Enable feature interactions
                )
            else:
                model = ExplainableBoostingRegressor(
                    random_state=42,
                    n_jobs=-1,
                    interactions=10,
                )
            
            # Train model
            logger.info(f"Training {model_type} glass-box model: {model_name}")
            model.fit(X, y)
            
            # Generate global explanation
            global_explanation = model.explain_global(name=f"{model_name}_global")
            
            # Store model and explanation
            self.glass_box_models[model_name] = {
                'model': model,
                'global_explanation': global_explanation,
                'model_type': model_type,
                'feature_names': list(X.columns),
                'created_at': datetime.now().isoformat()
            }
            
            # Extract feature importance for programmatic access
            feature_importance = self._extract_feature_importance(global_explanation)
            
            logger.info(f"Successfully created glass-box model: {model_name}")
            
            return {
                'model': model,
                'global_explanation': global_explanation,
                'feature_importance': feature_importance,
                'model_performance': self._evaluate_model_performance(model, X, y)
            }
            
        except Exception as e:
            logger.error(f"Error creating glass-box model: {str(e)}")
            raise
    
    def create_black_box_explainer(self, model, X_train: Union[pd.DataFrame, np.ndarray], 
                                  method: str = 'shap', explainer_name: str = 'default') -> Any:
        """
        Create explainer for black-box model.
        
        Args:
            model: Trained black-box model
            X_train: Training data for explainer initialization
            method: Explanation method ('shap', 'lime')
            explainer_name: Name identifier for the explainer
            
        Returns:
            Configured explainer object
        """
        try:
            if method.lower() == 'shap':
                if hasattr(model, 'predict_proba'):
                    explainer = ShapKernel(model.predict_proba, X_train, link="identity")
                else:
                    explainer = ShapKernel(model.predict, X_train, link="identity")
                    
            elif method.lower() == 'lime':
                if hasattr(model, 'predict_proba'):
                    explainer = LimeTabular(model.predict_proba, X_train, mode='classification')
                else:
                    explainer = LimeTabular(model.predict, X_train, mode='regression')
            else:
                raise ValueError(f"Unsupported explanation method: {method}")
            
            # Store explainer
            self.explainers[explainer_name] = {
                'explainer': explainer,
                'method': method,
                'model': model,
                'created_at': datetime.now().isoformat()
            }
            
            logger.info(f"Created {method} explainer: {explainer_name}")
            return explainer
            
        except Exception as e:
            logger.error(f"Error creating black-box explainer: {str(e)}")
            raise
    
    def explain_local(self, model_or_explainer_name: str, instance: Union[pd.Series, np.ndarray], 
                     explanation_name: str = None) -> Dict[str, Any]:
        """
        Generate local (instance-level) explanation.
        
        Args:
            model_or_explainer_name: Name of glass-box model or black-box explainer
            instance: Instance to explain
            explanation_name: Name for storing explanation
            
        Returns:
            Local explanation results
        """
        try:
            # Check if it's a glass-box model
            if model_or_explainer_name in self.glass_box_models:
                model_info = self.glass_box_models[model_or_explainer_name]
                model = model_info['model']
                
                # Generate local explanation
                if isinstance(instance, pd.Series):
                    instance_df = instance.to_frame().T
                else:
                    instance_df = pd.DataFrame([instance], columns=model_info['feature_names'])
                    
                local_explanation = model.explain_local(instance_df, name=explanation_name)
                
                # Extract programmatic explanation data
                explanation_data = self._extract_local_explanation_data(local_explanation, model_info)
                
            # Check if it's a black-box explainer
            elif model_or_explainer_name in self.explainers:
                explainer_info = self.explainers[model_or_explainer_name]
                explainer = explainer_info['explainer']
                
                # Convert instance to appropriate format
                if isinstance(instance, pd.Series):
                    instance_array = instance.values.reshape(1, -1)
                else:
                    instance_array = np.array(instance).reshape(1, -1)
                    
                # Generate explanation
                local_explanation = explainer.explain_local(instance_array, name=explanation_name)
                
                # Extract explanation data
                explanation_data = self._extract_black_box_explanation_data(
                    local_explanation, explainer_info, instance
                )
                
            else:
                raise ValueError(f"Unknown model or explainer: {model_or_explainer_name}")
            
            # Store explanation
            if explanation_name:
                self.explanations[explanation_name] = {
                    'explanation': local_explanation,
                    'data': explanation_data,
                    'type': 'local',
                    'created_at': datetime.now().isoformat()
                }
            
            return {
                'explanation': local_explanation,
                'data': explanation_data,
                'visualization_available': True
            }
            
        except Exception as e:
            logger.error(f"Error generating local explanation: {str(e)}")
            raise
    
    def explain_global(self, model_name: str) -> Dict[str, Any]:
        """
        Get global explanation for glass-box model.
        
        Args:
            model_name: Name of glass-box model
            
        Returns:
            Global explanation results
        """
        try:
            if model_name not in self.glass_box_models:
                raise ValueError(f"Glass-box model not found: {model_name}")
                
            model_info = self.glass_box_models[model_name]
            global_explanation = model_info['global_explanation']
            
            # Extract feature importance and interactions
            feature_importance = self._extract_feature_importance(global_explanation)
            feature_interactions = self._extract_feature_interactions(global_explanation)
            
            return {
                'explanation': global_explanation,
                'feature_importance': feature_importance,
                'feature_interactions': feature_interactions,
                'model_info': {
                    'type': model_info['model_type'],
                    'features': model_info['feature_names'],
                    'created_at': model_info['created_at']
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting global explanation: {str(e)}")
            raise
    
    def compare_explanations(self, explanation_names: List[str]) -> Dict[str, Any]:
        """
        Compare multiple explanations.
        
        Args:
            explanation_names: List of explanation names to compare
            
        Returns:
            Comparison results
        """
        try:
            explanations_to_compare = []
            
            for name in explanation_names:
                if name in self.explanations:
                    explanations_to_compare.append(self.explanations[name])
                else:
                    logger.warning(f"Explanation not found: {name}")
            
            if len(explanations_to_compare) < 2:
                raise ValueError("Need at least 2 explanations to compare")
            
            # Perform comparison analysis
            comparison_results = {
                'explanations_compared': explanation_names,
                'feature_importance_comparison': self._compare_feature_importance(explanations_to_compare),
                'consistency_metrics': self._calculate_consistency_metrics(explanations_to_compare),
                'timestamp': datetime.now().isoformat()
            }
            
            return comparison_results
            
        except Exception as e:
            logger.error(f"Error comparing explanations: {str(e)}")
            raise
    
    def get_model_performance(self, model_name: str, X_test: pd.DataFrame = None, 
                            y_test: Union[pd.Series, np.ndarray] = None) -> Dict[str, Any]:
        """
        Get performance metrics for glass-box model.
        
        Args:
            model_name: Name of glass-box model
            X_test: Test features (optional)
            y_test: Test targets (optional)
            
        Returns:
            Performance metrics
        """
        try:
            if model_name not in self.glass_box_models:
                raise ValueError(f"Glass-box model not found: {model_name}")
                
            model_info = self.glass_box_models[model_name]
            model = model_info['model']
            
            performance = {}
            
            # Training performance (always available)
            if hasattr(model, 'score'):
                # Get training data if available
                performance['training_score'] = getattr(model, 'score', None)
            
            # Test performance (if test data provided)
            if X_test is not None and y_test is not None:
                test_performance = self._evaluate_model_performance(model, X_test, y_test)
                performance.update(test_performance)
            
            # Model-specific metrics
            if hasattr(model, 'feature_importances_'):
                performance['feature_importance_stats'] = {
                    'max_importance': float(np.max(model.feature_importances_)),
                    'min_importance': float(np.min(model.feature_importances_)),
                    'mean_importance': float(np.mean(model.feature_importances_)),
                    'std_importance': float(np.std(model.feature_importances_))
                }
            
            return performance
            
        except Exception as e:
            logger.error(f"Error getting model performance: {str(e)}")
            raise
    
    def _extract_feature_importance(self, explanation) -> Dict[str, float]:
        """
        Extract feature importance from global explanation.
        
        Args:
            explanation: InterpretML explanation object
            
        Returns:
            Feature importance dictionary
        """
        try:
            # Access explanation data
            if hasattr(explanation, 'data'):
                data = explanation.data()
                
                if isinstance(data, dict) and 'scores' in data:
                    scores = data['scores']
                    names = data.get('names', [f'feature_{i}' for i in range(len(scores))])
                    
                    return dict(zip(names, scores))
                    
            return {}
            
        except Exception as e:
            logger.warning(f"Could not extract feature importance: {str(e)}")
            return {}
    
    def _extract_feature_interactions(self, explanation) -> Dict[str, Any]:
        """
        Extract feature interactions from global explanation.
        
        Args:
            explanation: InterpretML explanation object
            
        Returns:
            Feature interactions information
        """
        try:
            # InterpretML EBMs support interactions
            interactions = {}
            
            if hasattr(explanation, 'data'):
                data = explanation.data()
                
                # Look for interaction terms
                if isinstance(data, dict):
                    for i, name in enumerate(data.get('names', [])):
                        if ' x ' in str(name):  # Interaction term
                            score = data.get('scores', [0])[i] if i < len(data.get('scores', [])) else 0
                            interactions[str(name)] = float(score)
            
            return interactions
            
        except Exception as e:
            logger.warning(f"Could not extract feature interactions: {str(e)}")
            return {}
    
    def _extract_local_explanation_data(self, explanation, model_info: Dict) -> Dict[str, Any]:
        """
        Extract data from local explanation for glass-box model.
        
        Args:
            explanation: InterpretML local explanation
            model_info: Model information
            
        Returns:
            Extracted explanation data
        """
        try:
            data = {}
            
            if hasattr(explanation, 'data'):
                exp_data = explanation.data()
                
                if isinstance(exp_data, dict):
                    data = {
                        'feature_contributions': dict(zip(
                            exp_data.get('names', []), 
                            exp_data.get('scores', [])
                        )),
                        'feature_values': dict(zip(
                            exp_data.get('names', []), 
                            exp_data.get('values', [])
                        )),
                        'prediction': exp_data.get('perf', {})
                    }
            
            data['model_type'] = model_info['model_type']
            data['timestamp'] = datetime.now().isoformat()
            
            return data
            
        except Exception as e:
            logger.warning(f"Could not extract local explanation data: {str(e)}")
            return {'timestamp': datetime.now().isoformat()}
    
    def _extract_black_box_explanation_data(self, explanation, explainer_info: Dict, 
                                          instance: Union[pd.Series, np.ndarray]) -> Dict[str, Any]:
        """
        Extract data from black-box explanation.
        
        Args:
            explanation: InterpretML explanation object
            explainer_info: Explainer information
            instance: Original instance
            
        Returns:
            Extracted explanation data
        """
        try:
            data = {
                'method': explainer_info['method'],
                'timestamp': datetime.now().isoformat()
            }
            
            if hasattr(explanation, 'data'):
                exp_data = explanation.data()
                
                if isinstance(exp_data, dict):
                    data.update({
                        'feature_contributions': dict(zip(
                            exp_data.get('names', []), 
                            exp_data.get('scores', [])
                        )),
                        'feature_values': dict(zip(
                            exp_data.get('names', []), 
                            exp_data.get('values', [])
                        ))
                    })
            
            return data
            
        except Exception as e:
            logger.warning(f"Could not extract black-box explanation data: {str(e)}")
            return {
                'method': explainer_info['method'],
                'timestamp': datetime.now().isoformat()
            }
    
    def _evaluate_model_performance(self, model, X: Union[pd.DataFrame, np.ndarray], 
                                   y: Union[pd.Series, np.ndarray]) -> Dict[str, float]:
        """
        Evaluate model performance with various metrics.
        
        Args:
            model: Trained model
            X: Features
            y: Targets
            
        Returns:
            Performance metrics
        """
        try:
            from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
            from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
            
            predictions = model.predict(X)
            
            # Determine if classification or regression
            if hasattr(model, 'predict_proba'):
                # Classification metrics
                metrics = {
                    'accuracy': float(accuracy_score(y, predictions)),
                    'precision': float(precision_score(y, predictions, average='weighted', zero_division=0)),
                    'recall': float(recall_score(y, predictions, average='weighted', zero_division=0)),
                    'f1_score': float(f1_score(y, predictions, average='weighted', zero_division=0))
                }
            else:
                # Regression metrics
                metrics = {
                    'mse': float(mean_squared_error(y, predictions)),
                    'mae': float(mean_absolute_error(y, predictions)),
                    'r2_score': float(r2_score(y, predictions))
                }
            
            return metrics
            
        except Exception as e:
            logger.warning(f"Could not evaluate model performance: {str(e)}")
            return {}
    
    def _compare_feature_importance(self, explanations: List[Dict]) -> Dict[str, Any]:
        """
        Compare feature importance across explanations.
        
        Args:
            explanations: List of explanation dictionaries
            
        Returns:
            Feature importance comparison
        """
        try:
            all_features = set()
            importance_data = {}
            
            # Collect all feature importances
            for i, exp in enumerate(explanations):
                data = exp.get('data', {})
                contributions = data.get('feature_contributions', {})
                
                importance_data[f'explanation_{i}'] = contributions
                all_features.update(contributions.keys())
            
            # Calculate comparison metrics
            comparison = {
                'common_features': list(all_features),
                'importance_by_explanation': importance_data,
                'feature_ranking_comparison': self._compare_feature_rankings(importance_data)
            }
            
            return comparison
            
        except Exception as e:
            logger.warning(f"Could not compare feature importance: {str(e)}")
            return {}
    
    def _compare_feature_rankings(self, importance_data: Dict[str, Dict[str, float]]) -> Dict[str, Any]:
        """
        Compare feature rankings across explanations.
        
        Args:
            importance_data: Feature importance data by explanation
            
        Returns:
            Ranking comparison metrics
        """
        try:
            rankings = {}
            
            # Create rankings for each explanation
            for exp_name, importances in importance_data.items():
                sorted_features = sorted(
                    importances.items(), 
                    key=lambda x: abs(x[1]), 
                    reverse=True
                )
                rankings[exp_name] = [feature for feature, _ in sorted_features]
            
            # Calculate rank correlation if multiple explanations
            if len(rankings) >= 2:
                from scipy.stats import spearmanr
                
                exp_names = list(rankings.keys())
                correlations = {}
                
                for i in range(len(exp_names)):
                    for j in range(i+1, len(exp_names)):
                        exp1, exp2 = exp_names[i], exp_names[j]
                        
                        # Find common features
                        common_features = list(set(rankings[exp1]) & set(rankings[exp2]))
                        
                        if len(common_features) > 1:
                            rank1 = [rankings[exp1].index(f) for f in common_features]
                            rank2 = [rankings[exp2].index(f) for f in common_features]
                            
                            correlation, p_value = spearmanr(rank1, rank2)
                            
                            correlations[f"{exp1}_vs_{exp2}"] = {
                                'correlation': float(correlation),
                                'p_value': float(p_value),
                                'common_features_count': len(common_features)
                            }
            
            return {
                'rankings': rankings,
                'rank_correlations': correlations if len(rankings) >= 2 else {}
            }
            
        except Exception as e:
            logger.warning(f"Could not compare feature rankings: {str(e)}")
            return {}
    
    def _calculate_consistency_metrics(self, explanations: List[Dict]) -> Dict[str, float]:
        """
        Calculate consistency metrics across explanations.
        
        Args:
            explanations: List of explanation dictionaries
            
        Returns:
            Consistency metrics
        """
        try:
            if len(explanations) < 2:
                return {}
            
            # Extract feature contributions
            all_contributions = []
            for exp in explanations:
                data = exp.get('data', {})
                contributions = data.get('feature_contributions', {})
                all_contributions.append(contributions)
            
            # Calculate consistency metrics
            consistency_metrics = {
                'explanation_count': len(explanations),
                'average_feature_agreement': self._calculate_feature_agreement(all_contributions),
                'explanation_similarity': self._calculate_explanation_similarity(all_contributions)
            }
            
            return consistency_metrics
            
        except Exception as e:
            logger.warning(f"Could not calculate consistency metrics: {str(e)}")
            return {}
    
    def _calculate_feature_agreement(self, contributions_list: List[Dict[str, float]]) -> float:
        """
        Calculate agreement in feature importance signs across explanations.
        
        Args:
            contributions_list: List of feature contribution dictionaries
            
        Returns:
            Agreement score (0-1)
        """
        if len(contributions_list) < 2:
            return 1.0
        
        # Find common features
        common_features = set(contributions_list[0].keys())
        for contrib in contributions_list[1:]:
            common_features &= set(contrib.keys())
        
        if not common_features:
            return 0.0
        
        # Calculate sign agreement
        agreements = 0
        total_comparisons = 0
        
        for feature in common_features:
            signs = [np.sign(contrib[feature]) for contrib in contributions_list]
            
            # Count pairwise agreements
            for i in range(len(signs)):
                for j in range(i+1, len(signs)):
                    if signs[i] == signs[j]:
                        agreements += 1
                    total_comparisons += 1
        
        return agreements / total_comparisons if total_comparisons > 0 else 0.0
    
    def _calculate_explanation_similarity(self, contributions_list: List[Dict[str, float]]) -> float:
        """
        Calculate overall similarity between explanations.
        
        Args:
            contributions_list: List of feature contribution dictionaries
            
        Returns:
            Similarity score (0-1)
        """
        if len(contributions_list) < 2:
            return 1.0
        
        # Find common features
        common_features = set(contributions_list[0].keys())
        for contrib in contributions_list[1:]:
            common_features &= set(contrib.keys())
        
        if not common_features:
            return 0.0
        
        # Create vectors for correlation calculation
        vectors = []
        for contrib in contributions_list:
            vector = [contrib[feature] for feature in sorted(common_features)]
            vectors.append(vector)
        
        # Calculate pairwise correlations
        similarities = []
        for i in range(len(vectors)):
            for j in range(i+1, len(vectors)):
                correlation = np.corrcoef(vectors[i], vectors[j])[0, 1]
                if not np.isnan(correlation):
                    similarities.append(abs(correlation))
        
        return np.mean(similarities) if similarities else 0.0
