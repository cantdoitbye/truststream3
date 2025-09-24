"""Interpretability module for TrustStram v4.4

Implements SHAP, InterpretML, and HAG-XAI frameworks.
"""

from .shap_explainer import SHAPExplainer
from .interpret_ml import InterpretMLFramework
from .hag_xai import HAGXAIExplainer
from .counterfactuals import CounterfactualGenerator

__all__ = [
    'SHAPExplainer',
    'InterpretMLFramework',
    'HAGXAIExplainer', 
    'CounterfactualGenerator'
]
