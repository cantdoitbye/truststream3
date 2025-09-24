"""Bias detection and fairness monitoring for TrustStram v4.4

Integrates Aequitas and Fairlearn for comprehensive bias auditing.
"""

from .aequitas_framework import AequitasFramework
from .fairlearn_integration import FairlearnIntegration
from .bias_monitor import BiasMonitor

__all__ = [
    'AequitasFramework',
    'FairlearnIntegration', 
    'BiasMonitor'
]
