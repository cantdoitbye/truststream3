"""
Base Framework Interface for Federated Learning

Defines the common interface that all federated learning frameworks must implement.
This ensures consistency and interoperability across different FL frameworks.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Tuple, Callable, Any
import logging

from ..types.common_types import ModelUpdate, ClientConfig, TrainingMetrics


class BaseFramework(ABC):
    """Abstract base class for federated learning frameworks."""
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.is_initialized = False
        self.framework_name = "Unknown"
        self.framework_type = "Unknown"
    
    @abstractmethod
    def initialize(self, model_fn: Callable, data_fn: Callable) -> None:
        """
        Initialize the framework with model and data functions.
        
        Args:
            model_fn: Function that returns a model instance
            data_fn: Function that returns data loaders/datasets
        """
        pass
    
    @abstractmethod
    def get_framework_info(self) -> Dict[str, Any]:
        """
        Get information about the framework capabilities.
        
        Returns:
            Dictionary containing framework information
        """
        pass
    
    def validate_initialization(self) -> bool:
        """
        Validate that the framework is properly initialized.
        
        Returns:
            True if framework is ready to use, False otherwise
        """
        return self.is_initialized
    
    def get_supported_scenarios(self) -> List[str]:
        """
        Get list of supported federated learning scenarios.
        
        Returns:
            List of supported scenario types
        """
        return ["horizontal", "cross_device", "cross_silo"]
    
    def get_supported_privacy_techniques(self) -> List[str]:
        """
        Get list of supported privacy-preserving techniques.
        
        Returns:
            List of supported privacy techniques
        """
        return ["differential_privacy", "secure_aggregation"]
    
    def get_supported_security_features(self) -> List[str]:
        """
        Get list of supported security features.
        
        Returns:
            List of supported security features
        """
        return ["byzantine_robustness", "secure_communication"]
    
    def get_performance_features(self) -> List[str]:
        """
        Get list of supported performance optimization features.
        
        Returns:
            List of supported performance features
        """
        return ["communication_compression", "adaptive_aggregation"]
    
    def set_configuration(self, config: Dict[str, Any]) -> None:
        """
        Set framework-specific configuration.
        
        Args:
            config: Configuration dictionary
        """
        self.logger.info(f"Configuration updated for {self.framework_name}")
    
    def get_configuration(self) -> Dict[str, Any]:
        """
        Get current framework configuration.
        
        Returns:
            Current configuration dictionary
        """
        return {}
    
    def validate_model_compatibility(self, model: Any) -> bool:
        """
        Validate if a model is compatible with this framework.
        
        Args:
            model: Model to validate
            
        Returns:
            True if compatible, False otherwise
        """
        # Default implementation - can be overridden by specific frameworks
        return True
    
    def validate_data_compatibility(self, data: Any) -> bool:
        """
        Validate if data format is compatible with this framework.
        
        Args:
            data: Data to validate
            
        Returns:
            True if compatible, False otherwise
        """
        # Default implementation - can be overridden by specific frameworks
        return True
    
    def get_resource_requirements(self) -> Dict[str, Any]:
        """
        Get resource requirements for running this framework.
        
        Returns:
            Dictionary containing resource requirements
        """
        return {
            "min_memory_mb": 512,
            "min_cpu_cores": 1,
            "gpu_required": False,
            "network_bandwidth_mbps": 10
        }
    
    def estimate_training_time(self, 
                             num_clients: int, 
                             num_rounds: int,
                             model_size_mb: float) -> float:
        """
        Estimate training time based on parameters.
        
        Args:
            num_clients: Number of participating clients
            num_rounds: Number of training rounds
            model_size_mb: Model size in megabytes
            
        Returns:
            Estimated training time in minutes
        """
        # Simple estimation - can be overridden by specific frameworks
        base_time = num_rounds * 2  # 2 minutes per round base
        client_overhead = num_clients * 0.1  # 0.1 minutes per client
        model_overhead = model_size_mb * 0.05  # 0.05 minutes per MB
        
        return base_time + client_overhead + model_overhead
    
    def cleanup(self) -> None:
        """Clean up framework resources."""
        self.is_initialized = False
        self.logger.info(f"{self.framework_name} framework cleaned up")
