"""
Federated Learning Framework Integrations

This module provides unified interfaces for different federated learning frameworks:
- Flower: Cross-device FL scenarios with scalability up to 15M clients
- TensorFlow Federated (TFF): Cross-silo enterprise deployments
"""

from .flower_integration import FlowerFramework
from .tff_integration import TFFFramework
from .framework_manager import FrameworkManager

__all__ = [
    'FlowerFramework',
    'TFFFramework', 
    'FrameworkManager'
]
