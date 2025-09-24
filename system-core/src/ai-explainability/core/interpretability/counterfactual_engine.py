"""
Counterfactual Explanation Engine for TrustStram v4.4

Generates "what-if" counterfactual explanations showing minimal changes
needed to alter model predictions, providing actionable insights.
"""

import asyncio
import logging
import time
from typing import Dict, List, Any, Optional, Union, Tuple

import numpy as np
import pandas as pd
from datetime import datetime

# Optimization imports
try:
    import cvxpy as cp
    from scipy.optimize import minimize
except ImportError:
    logging.warning("Optimization libraries not available. Install with: pip install cvxpy scipy")
    cp = None

from sklearn.metrics import pairwise_distances
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

class CounterfactualEngine:
    """
    Advanced counterfactual explanation engine that generates actionable
    "what-if" scenarios for model predictions.
    """
    
    def __init__(self):
        """
        Initialize counterfactual engine with optimization methods.
        """
        self.counterfactual_cache = {}
        self.feature_constraints = {}
        self.optimization_methods = ['gradient_based', 'genetic', 'random_search']
        
        if cp is None:
            logger.warning("CVXPY not available. Some optimization methods may be limited.")
        
        logger.info("Counterfactual Engine initialized")
    
    async def generate_counterfactuals(
        self,
        model: Any,
        instance: Union[pd.DataFrame, np.ndarray],
        desired_outcome: Optional[Any] = None,
        max_changes: int = 3,
        optimization_method: str = 'gradient_based',
        distance_metric: str = 'euclidean',
        feature_constraints: Optional[Dict[str, Dict]] = None,
        n_counterfactuals: int = 3
    ) -> Dict[str, Any]:
        """
        Generate counterfactual explanations for an instance.
        
        Args:
            model: Trained model to generate counterfactuals for
            instance: Instance to generate counterfactuals for
            desired_outcome: Target outcome for counterfactuals
            max_changes: Maximum number of features to change
            optimization_method: Method for optimization
            distance_metric: Distance metric for proximity
            feature_constraints: Constraints on feature changes
            n_counterfactuals: Number of counterfactuals to generate
            
        Returns:
            Dictionary containing counterfactual explanations
        """
        start_time = time.time()
        
        try:
            # Convert instance to appropriate format
            if isinstance(instance, pd.DataFrame):
                instance_array = instance.values.flatten()
                feature_names = list(instance.columns)
            else:
                instance_array = np.array(instance).flatten()
                feature_names = [f"feature_{i}" for i in range(len(instance_array))]
            
            # Get original prediction
            original_prediction = model.predict(instance_array.reshape(1, -1))[0]
            
            if hasattr(model, 'predict_proba'):
                original_proba = model.predict_proba(instance_array.reshape(1, -1))[0]
            else:
                original_proba = [original_prediction]
            
            # Determine desired outcome if not specified
            if desired_outcome is None:
                desired_outcome = await self._determine_desired_outcome(
                    original_prediction, original_proba
                )
            
            # Apply feature constraints
            constraints = feature_constraints or {}
            constraints = await self._prepare_constraints(
                constraints, instance_array, feature_names
            )
            
            # Generate counterfactuals using specified method
            counterfactuals = await self._generate_counterfactuals_by_method(
                model, instance_array, desired_outcome, max_changes,
                optimization_method, distance_metric, constraints, n_counterfactuals
            )
            
            # Evaluate counterfactuals
            evaluated_counterfactuals = await self._evaluate_counterfactuals(
                model, instance_array, counterfactuals, desired_outcome,
                distance_metric, feature_names
            )
            
            # Generate actionable insights
            actionable_insights = await self._generate_actionable_insights(
                instance_array, evaluated_counterfactuals, feature_names
            )
            
            # Calculate feasibility scores
            feasibility_scores = await self._calculate_feasibility_scores(
                instance_array, evaluated_counterfactuals, constraints
            )
            
            result = {
                'original_prediction': original_prediction,
                'original_probabilities': original_proba.tolist() if hasattr(original_proba, 'tolist') else [original_proba],
                'desired_outcome': desired_outcome,
                'counterfactuals': evaluated_counterfactuals,
                'actionable_insights': actionable_insights,
                'feasibility_scores': feasibility_scores,
                'optimization_metadata': {
                    'method': optimization_method,
                    'max_changes': max_changes,
                    'n_generated': len(evaluated_counterfactuals),
                    'generation_time_ms': (time.time() - start_time) * 1000,
                    'timestamp': datetime.now().isoformat()
                }
            }
            
            logger.info(f"Generated {len(evaluated_counterfactuals)} counterfactuals in {(time.time() - start_time)*1000:.2f}ms")
            return result
            
        except Exception as e:
            logger.error(f"Error generating counterfactuals: {str(e)}")
            raise
    
    async def _determine_desired_outcome(
        self,
        original_prediction: Any,
        original_proba: np.ndarray
    ) -> Any:
        """
        Determine desired outcome based on original prediction.
        """
        # For binary classification, flip the class
        if len(original_proba) == 2:
            return 1 - original_prediction
        
        # For multi-class, choose the second most likely class
        elif len(original_proba) > 2:
            sorted_indices = np.argsort(original_proba)[::-1]
            return sorted_indices[1]  # Second most likely class
        
        # For regression, move in opposite direction
        else:
            return original_prediction * 0.8 if original_prediction > 0 else original_prediction * 1.2
    
    async def _prepare_constraints(
        self,
        feature_constraints: Dict[str, Dict],
        instance: np.ndarray,
        feature_names: List[str]
    ) -> Dict[int, Dict]:
        """
        Prepare feature constraints for optimization.
        """
        constraints = {}
        
        for i, feature_name in enumerate(feature_names):
            if feature_name in feature_constraints:
                constraints[i] = feature_constraints[feature_name]
            else:
                # Default constraints based on feature type
                current_value = instance[i]
                
                # Assume continuous features can change by ±50%
                constraints[i] = {
                    'min': current_value * 0.5 if current_value > 0 else current_value * 1.5,
                    'max': current_value * 1.5 if current_value > 0 else current_value * 0.5,
                    'mutable': True
                }
        
        return constraints
    
    async def _generate_counterfactuals_by_method(
        self,
        model: Any,
        instance: np.ndarray,
        desired_outcome: Any,
        max_changes: int,
        method: str,
        distance_metric: str,
        constraints: Dict[int, Dict],
        n_counterfactuals: int
    ) -> List[np.ndarray]:
        """
        Generate counterfactuals using the specified method.
        """
        if method == 'gradient_based':
            return await self._gradient_based_counterfactuals(
                model, instance, desired_outcome, max_changes, constraints, n_counterfactuals
            )
        elif method == 'genetic':
            return await self._genetic_counterfactuals(
                model, instance, desired_outcome, max_changes, constraints, n_counterfactuals
            )
        elif method == 'random_search':
            return await self._random_search_counterfactuals(
                model, instance, desired_outcome, max_changes, constraints, n_counterfactuals
            )
        else:
            raise ValueError(f"Unsupported optimization method: {method}")
    
    async def _gradient_based_counterfactuals(
        self,
        model: Any,
        instance: np.ndarray,
        desired_outcome: Any,
        max_changes: int,
        constraints: Dict[int, Dict],
        n_counterfactuals: int
    ) -> List[np.ndarray]:
        """
        Generate counterfactuals using gradient-based optimization.
        """
        counterfactuals = []
        
        for attempt in range(n_counterfactuals * 2):  # Try more attempts
            try:
                # Initialize with original instance
                counterfactual = instance.copy()
                
                # Gradient descent parameters
                learning_rate = 0.01
                max_iterations = 100
                tolerance = 1e-6
                
                for iteration in range(max_iterations):
                    # Get current prediction
                    current_pred = model.predict(counterfactual.reshape(1, -1))[0]
                    
                    # Check if we've reached desired outcome
                    if self._check_desired_outcome(current_pred, desired_outcome):
                        break
                    
                    # Calculate gradients using finite differences
                    gradients = await self._calculate_gradients(
                        model, counterfactual, desired_outcome
                    )
                    
                    # Update counterfactual
                    old_counterfactual = counterfactual.copy()
                    
                    # Only update the top features by gradient magnitude
                    top_indices = np.argsort(np.abs(gradients))[-max_changes:]
                    
                    for idx in top_indices:
                        if constraints[idx].get('mutable', True):
                            update = learning_rate * gradients[idx]
                            new_value = counterfactual[idx] + update
                            
                            # Apply constraints
                            new_value = np.clip(
                                new_value,
                                constraints[idx].get('min', -np.inf),
                                constraints[idx].get('max', np.inf)
                            )
                            
                            counterfactual[idx] = new_value
                    
                    # Check convergence
                    if np.linalg.norm(counterfactual - old_counterfactual) < tolerance:
                        break
                
                # Verify this is a valid counterfactual
                final_pred = model.predict(counterfactual.reshape(1, -1))[0]
                if (self._check_desired_outcome(final_pred, desired_outcome) and 
                    not np.array_equal(counterfactual, instance)):
                    
                    counterfactuals.append(counterfactual)
                    
                    if len(counterfactuals) >= n_counterfactuals:
                        break
                        
            except Exception as e:
                logger.warning(f"Gradient-based attempt {attempt} failed: {str(e)}")
                continue
        
        return counterfactuals
    
    async def _genetic_counterfactuals(
        self,
        model: Any,
        instance: np.ndarray,
        desired_outcome: Any,
        max_changes: int,
        constraints: Dict[int, Dict],
        n_counterfactuals: int
    ) -> List[np.ndarray]:
        """
        Generate counterfactuals using genetic algorithm.
        """
        population_size = 50
        generations = 100
        mutation_rate = 0.1
        
        # Initialize population
        population = []
        for _ in range(population_size):
            individual = instance.copy()
            
            # Mutate a few random features
            mutable_indices = [i for i, c in constraints.items() if c.get('mutable', True)]
            change_indices = np.random.choice(
                mutable_indices, 
                size=min(max_changes, len(mutable_indices)), 
                replace=False
            )
            
            for idx in change_indices:
                min_val = constraints[idx].get('min', instance[idx] * 0.5)
                max_val = constraints[idx].get('max', instance[idx] * 1.5)
                individual[idx] = np.random.uniform(min_val, max_val)
            
            population.append(individual)
        
        counterfactuals = []
        
        for generation in range(generations):
            # Evaluate fitness
            fitness_scores = []
            for individual in population:
                fitness = await self._calculate_fitness(
                    model, individual, instance, desired_outcome
                )
                fitness_scores.append(fitness)
            
            # Select best individuals
            fitness_array = np.array(fitness_scores)
            sorted_indices = np.argsort(fitness_array)[::-1]
            
            # Check for valid counterfactuals
            for idx in sorted_indices[:n_counterfactuals]:
                individual = population[idx]
                pred = model.predict(individual.reshape(1, -1))[0]
                
                if (self._check_desired_outcome(pred, desired_outcome) and
                    not np.array_equal(individual, instance)):
                    
                    if not any(np.array_equal(individual, cf) for cf in counterfactuals):
                        counterfactuals.append(individual.copy())
            
            if len(counterfactuals) >= n_counterfactuals:
                break
            
            # Create next generation
            new_population = []
            
            # Keep best individuals
            elite_size = population_size // 4
            for i in range(elite_size):
                new_population.append(population[sorted_indices[i]].copy())
            
            # Generate offspring
            while len(new_population) < population_size:
                # Select parents
                parent1 = population[np.random.choice(sorted_indices[:population_size//2])]
                parent2 = population[np.random.choice(sorted_indices[:population_size//2])]
                
                # Crossover
                offspring = parent1.copy()
                crossover_mask = np.random.random(len(offspring)) < 0.5
                offspring[crossover_mask] = parent2[crossover_mask]
                
                # Mutation
                if np.random.random() < mutation_rate:
                    mutable_indices = [i for i, c in constraints.items() if c.get('mutable', True)]
                    if mutable_indices:
                        mutate_idx = np.random.choice(mutable_indices)
                        min_val = constraints[mutate_idx].get('min', instance[mutate_idx] * 0.5)
                        max_val = constraints[mutate_idx].get('max', instance[mutate_idx] * 1.5)
                        offspring[mutate_idx] = np.random.uniform(min_val, max_val)
                
                new_population.append(offspring)
            
            population = new_population
        
        return counterfactuals
    
    async def _random_search_counterfactuals(
        self,
        model: Any,
        instance: np.ndarray,
        desired_outcome: Any,
        max_changes: int,
        constraints: Dict[int, Dict],
        n_counterfactuals: int
    ) -> List[np.ndarray]:
        """
        Generate counterfactuals using random search.
        """
        counterfactuals = []
        max_attempts = 1000
        
        mutable_indices = [i for i, c in constraints.items() if c.get('mutable', True)]
        
        for attempt in range(max_attempts):
            if len(counterfactuals) >= n_counterfactuals:
                break
            
            # Create random modification
            counterfactual = instance.copy()
            
            # Randomly select features to change
            n_changes = np.random.randint(1, min(max_changes + 1, len(mutable_indices) + 1))
            change_indices = np.random.choice(
                mutable_indices, 
                size=n_changes, 
                replace=False
            )
            
            # Apply random changes within constraints
            for idx in change_indices:
                min_val = constraints[idx].get('min', instance[idx] * 0.5)
                max_val = constraints[idx].get('max', instance[idx] * 1.5)
                counterfactual[idx] = np.random.uniform(min_val, max_val)
            
            # Check if this achieves desired outcome
            pred = model.predict(counterfactual.reshape(1, -1))[0]
            
            if (self._check_desired_outcome(pred, desired_outcome) and
                not np.array_equal(counterfactual, instance)):
                
                # Check for duplicates
                if not any(np.allclose(counterfactual, cf, rtol=1e-3) for cf in counterfactuals):
                    counterfactuals.append(counterfactual)
        
        return counterfactuals
    
    def _check_desired_outcome(self, prediction: Any, desired_outcome: Any) -> bool:
        """
        Check if prediction matches desired outcome.
        """
        if isinstance(desired_outcome, (int, np.integer)):
            return int(prediction) == int(desired_outcome)
        elif isinstance(desired_outcome, float):
            return abs(prediction - desired_outcome) < 0.1  # Allow small tolerance
        else:
            return prediction == desired_outcome
    
    async def _calculate_gradients(
        self,
        model: Any,
        instance: np.ndarray,
        desired_outcome: Any
    ) -> np.ndarray:
        """
        Calculate gradients using finite differences.
        """
        epsilon = 1e-4
        gradients = np.zeros_like(instance)
        
        # Get current prediction
        current_pred = model.predict(instance.reshape(1, -1))[0]
        
        # Calculate loss
        current_loss = self._calculate_loss(current_pred, desired_outcome)
        
        for i in range(len(instance)):
            # Perturb feature
            perturbed_instance = instance.copy()
            perturbed_instance[i] += epsilon
            
            # Get perturbed prediction
            perturbed_pred = model.predict(perturbed_instance.reshape(1, -1))[0]
            perturbed_loss = self._calculate_loss(perturbed_pred, desired_outcome)
            
            # Calculate gradient
            gradients[i] = -(perturbed_loss - current_loss) / epsilon  # Negative for minimization
        
        return gradients
    
    def _calculate_loss(
        self,
        prediction: Any,
        desired_outcome: Any
    ) -> float:
        """
        Calculate loss between prediction and desired outcome.
        """
        if isinstance(desired_outcome, (int, np.integer)):
            # Classification loss
            return 0.0 if int(prediction) == int(desired_outcome) else 1.0
        else:
            # Regression loss
            return (prediction - desired_outcome) ** 2
    
    async def _calculate_fitness(
        self,
        model: Any,
        individual: np.ndarray,
        original_instance: np.ndarray,
        desired_outcome: Any
    ) -> float:
        """
        Calculate fitness for genetic algorithm.
        """
        try:
            # Get prediction
            pred = model.predict(individual.reshape(1, -1))[0]
            
            # Outcome fitness
            outcome_fitness = 1.0 if self._check_desired_outcome(pred, desired_outcome) else 0.0
            
            # Distance penalty (prefer closer counterfactuals)
            distance = np.linalg.norm(individual - original_instance)
            distance_fitness = 1.0 / (1.0 + distance)
            
            # Sparsity bonus (prefer fewer changes)
            n_changes = np.sum(~np.isclose(individual, original_instance, rtol=1e-3))
            sparsity_fitness = 1.0 / (1.0 + n_changes)
            
            # Combined fitness
            fitness = 0.6 * outcome_fitness + 0.3 * distance_fitness + 0.1 * sparsity_fitness
            
            return fitness
            
        except Exception:
            return 0.0
    
    async def _evaluate_counterfactuals(
        self,
        model: Any,
        original_instance: np.ndarray,
        counterfactuals: List[np.ndarray],
        desired_outcome: Any,
        distance_metric: str,
        feature_names: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Evaluate and rank counterfactuals.
        """
        evaluated = []
        
        for i, cf in enumerate(counterfactuals):
            try:
                # Get prediction
                prediction = model.predict(cf.reshape(1, -1))[0]
                
                if hasattr(model, 'predict_proba'):
                    probabilities = model.predict_proba(cf.reshape(1, -1))[0]
                else:
                    probabilities = [prediction]
                
                # Calculate changes
                changes = await self._calculate_changes(
                    original_instance, cf, feature_names
                )
                
                # Calculate distance
                if distance_metric == 'euclidean':
                    distance = float(np.linalg.norm(cf - original_instance))
                elif distance_metric == 'manhattan':
                    distance = float(np.sum(np.abs(cf - original_instance)))
                else:
                    distance = float(np.linalg.norm(cf - original_instance))  # Default to euclidean
                
                # Calculate sparsity (number of changed features)
                sparsity = len(changes)
                
                # Calculate proximity score
                proximity_score = 1.0 / (1.0 + distance)
                
                evaluated.append({
                    'counterfactual_id': i,
                    'prediction': prediction,
                    'probabilities': probabilities.tolist() if hasattr(probabilities, 'tolist') else [probabilities],
                    'feature_values': cf.tolist(),
                    'changes': changes,
                    'distance': distance,
                    'sparsity': sparsity,
                    'proximity_score': proximity_score,
                    'achieves_desired_outcome': self._check_desired_outcome(prediction, desired_outcome)
                })
                
            except Exception as e:
                logger.warning(f"Error evaluating counterfactual {i}: {str(e)}")
                continue
        
        # Sort by proximity score (prefer closer counterfactuals)
        evaluated.sort(key=lambda x: x['proximity_score'], reverse=True)
        
        return evaluated
    
    async def _calculate_changes(
        self,
        original: np.ndarray,
        counterfactual: np.ndarray,
        feature_names: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Calculate changes between original and counterfactual instances.
        """
        changes = []
        
        for i, (orig_val, cf_val) in enumerate(zip(original, counterfactual)):
            if not np.isclose(orig_val, cf_val, rtol=1e-3):
                change_magnitude = abs(cf_val - orig_val)
                change_direction = 'increase' if cf_val > orig_val else 'decrease'
                change_percentage = (change_magnitude / abs(orig_val)) * 100 if orig_val != 0 else float('inf')
                
                changes.append({
                    'feature': feature_names[i],
                    'original_value': float(orig_val),
                    'counterfactual_value': float(cf_val),
                    'change_magnitude': float(change_magnitude),
                    'change_direction': change_direction,
                    'change_percentage': float(change_percentage) if change_percentage != float('inf') else None
                })
        
        return changes
    
    async def _generate_actionable_insights(
        self,
        original_instance: np.ndarray,
        counterfactuals: List[Dict[str, Any]],
        feature_names: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Generate actionable insights from counterfactuals.
        """
        insights = []
        
        if not counterfactuals:
            return insights
        
        # Analyze most common changes across counterfactuals
        feature_change_frequency = {}
        feature_change_directions = {}
        
        for cf in counterfactuals:
            for change in cf['changes']:
                feature = change['feature']
                direction = change['change_direction']
                
                if feature not in feature_change_frequency:
                    feature_change_frequency[feature] = 0
                    feature_change_directions[feature] = {'increase': 0, 'decrease': 0}
                
                feature_change_frequency[feature] += 1
                feature_change_directions[feature][direction] += 1
        
        # Sort features by frequency of change
        sorted_features = sorted(
            feature_change_frequency.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        # Generate insights for top features
        for feature, frequency in sorted_features[:5]:  # Top 5 most important features
            directions = feature_change_directions[feature]
            primary_direction = 'increase' if directions['increase'] > directions['decrease'] else 'decrease'
            
            # Calculate average change magnitude
            change_magnitudes = []
            for cf in counterfactuals:
                for change in cf['changes']:
                    if change['feature'] == feature:
                        change_magnitudes.append(change['change_magnitude'])
            
            avg_magnitude = np.mean(change_magnitudes) if change_magnitudes else 0
            
            insight = {
                'feature': feature,
                'importance_rank': len(insights) + 1,
                'change_frequency': frequency,
                'recommended_direction': primary_direction,
                'average_change_magnitude': float(avg_magnitude),
                'actionability_score': self._calculate_actionability_score(feature),
                'recommendation': self._generate_feature_recommendation(feature, primary_direction, avg_magnitude)
            }
            
            insights.append(insight)
        
        return insights
    
    def _calculate_actionability_score(self, feature_name: str) -> float:
        """
        Calculate how actionable a feature change is for users.
        """
        feature_lower = feature_name.lower()
        
        # Highly actionable features
        if any(actionable in feature_lower for actionable in 
               ['income', 'education', 'experience', 'skill', 'training']):
            return 0.9
        
        # Moderately actionable features
        elif any(moderate in feature_lower for moderate in 
                ['location', 'employment', 'debt', 'savings']):
            return 0.6
        
        # Less actionable features
        elif any(less_actionable in feature_lower for less_actionable in 
                ['age', 'gender', 'race', 'family']):
            return 0.3
        
        return 0.5  # Default
    
    def _generate_feature_recommendation(self, feature: str, direction: str, magnitude: float) -> str:
        """
        Generate human-readable recommendation for feature change.
        """
        if direction == 'increase':
            action_verb = 'increase' if 'increase' in feature.lower() else 'improve'
            return f"Consider working to {action_verb} your {feature} by approximately {magnitude:.2f}"
        else:
            action_verb = 'reduce' if 'reduce' in feature.lower() else 'decrease'
            return f"Consider working to {action_verb} your {feature} by approximately {magnitude:.2f}"
    
    async def _calculate_feasibility_scores(
        self,
        original_instance: np.ndarray,
        counterfactuals: List[Dict[str, Any]],
        constraints: Dict[int, Dict]
    ) -> Dict[str, float]:
        """
        Calculate feasibility scores for counterfactuals.
        """
        if not counterfactuals:
            return {'average_feasibility': 0.0, 'max_feasibility': 0.0}
        
        feasibility_scores = []
        
        for cf in counterfactuals:
            # Constraint satisfaction score
            constraint_score = 1.0
            
            # Distance-based feasibility
            distance_score = cf['proximity_score']
            
            # Sparsity-based feasibility (fewer changes = more feasible)
            sparsity_score = 1.0 / (1.0 + cf['sparsity'])
            
            # Actionability score (based on feature types)
            actionability_scores = []
            for change in cf['changes']:
                action_score = self._calculate_actionability_score(change['feature'])
                actionability_scores.append(action_score)
            
            avg_actionability = np.mean(actionability_scores) if actionability_scores else 0.5
            
            # Combined feasibility
            feasibility = (
                0.3 * constraint_score +
                0.3 * distance_score +
                0.2 * sparsity_score +
                0.2 * avg_actionability
            )
            
            feasibility_scores.append(feasibility)
        
        return {
            'average_feasibility': float(np.mean(feasibility_scores)),
            'max_feasibility': float(np.max(feasibility_scores)),
            'min_feasibility': float(np.min(feasibility_scores)),
            'feasibility_std': float(np.std(feasibility_scores))
        }
