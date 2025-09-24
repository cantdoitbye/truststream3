"""
TrustStram v4.4 AI Explainability Features

Comprehensive AI explainability system implementing state-of-the-art techniques
for model interpretability, bias detection, audit trails, and regulatory compliance.

Based on research findings in docs/v4_4_ai_explainability_research.md
"""

__version__ = "4.4.0"
__author__ = "TrustStram Development Team"
__email__ = "dev@truststream.com"

from .core.interpretability import (
    TrustStramSHAPExplainer,
    HAGXAIExplainer,
    TrustStramCounterfactualGenerator,
    TrustStramInterpretMLFramework
)

from .core.transparency import (
    TrustStramRuleExtractor,
    ComprehensiveFeatureImportance
)

from .core.bias_detection import (
    TrustStramFairnessFramework,
    FairlearnIntegration
)

from .core.caching import (
    ExplanationCache,
    AsyncExplanationService
)

from .compliance import (
    GDPRComplianceFramework,
    AIActComplianceFramework,
    FinancialServicesCompliance
)

from .interfaces import (
    StakeholderExplanationFramework,
    EndUserInterface,
    TechnicalUserInterface,
    BusinessUserInterface
)

__all__ = [
    # Core Interpretability
    "TrustStramSHAPExplainer",
    "HAGXAIExplainer", 
    "TrustStramCounterfactualGenerator",
    "TrustStramInterpretMLFramework",
    
    # Transparency
    "TrustStramRuleExtractor",
    "ComprehensiveFeatureImportance",
    
    # Bias Detection
    "TrustStramFairnessFramework",
    "FairlearnIntegration",
    
    # Caching
    "ExplanationCache",
    "AsyncExplanationService",
    
    # Compliance
    "GDPRComplianceFramework",
    "AIActComplianceFramework",
    "FinancialServicesCompliance",
    
    # Interfaces
    "StakeholderExplanationFramework",
    "EndUserInterface",
    "TechnicalUserInterface",
    "BusinessUserInterface",
]

# Package metadata
__package_metadata__ = {
    "name": "truststream-ai-explainability",
    "version": __version__,
    "description": "Comprehensive AI explainability system for TrustStram v4.4",
    "author": __author__,
    "author_email": __email__,
    "url": "https://github.com/truststream/ai-explainability",
    "license": "MIT",
    "python_requires": ">=3.9",
    "keywords": [
        "explainable-ai", "xai", "interpretability", "shap", "lime",
        "bias-detection", "fairness", "gdpr", "eu-ai-act", "compliance"
    ],
    "classifiers": [
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Intended Audience :: Data Scientists",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "Topic :: Software Development :: Libraries :: Python Modules"
    ]
}
