"""
Framework Manager for Unified Federated Learning Framework Management

Provides a unified interface to manage multiple federated learning frameworks:
- Flower: For cross-device scenarios (up to 15M clients)
- TensorFlow Federated: For cross-silo enterprise deployments
- Automatic framework selection based on scenario requirements
- Unified orchestration and configuration management
"""

import logging
from typing import Dict, List, Optional, Tuple, Callable, Any, Union
from enum import Enum
from dataclasses import dataclass

from .flower_integration import FlowerFramework, FlowerConfig
from .tff_integration import TFFFramework, TFFConfig
from ..core.base_framework import BaseFramework
from ..security.security_manager import SecurityManager
from ..privacy.differential_privacy import DifferentialPrivacyManager
from ..performance.performance_optimizer import PerformanceOptimizer
from ..types.common_types import ModelUpdate, ClientConfig, TrainingMetrics


class FrameworkType(Enum):
    """Supported federated learning framework types."""
    FLOWER = "flower"
    TFF = "tensorflow_federated"
    AUTO = "auto"


class ScenarioType(Enum):
    """Federated learning scenario types."""
    CROSS_DEVICE = "cross_device"
    CROSS_SILO = "cross_silo"
    HORIZONTAL = "horizontal"
    VERTICAL = "vertical"
    AUTO = "auto"


@dataclass
class FrameworkManagerConfig:
    """Configuration for the framework manager."""
    default_framework: FrameworkType = FrameworkType.AUTO
    auto_selection_enabled: bool = True
    max_cross_device_clients: int = 15000000  # 15M client threshold
    cross_silo_threshold: int = 1000
    performance_monitoring: bool = True
    security_level: str = "high"  # low, medium, high
    privacy_level: str = "medium"  # low, medium, high
    

class FrameworkManager:
    """Unified framework manager for federated learning."""
    
    def __init__(self, 
                 config: FrameworkManagerConfig,
                 security_manager: SecurityManager,
                 privacy_manager: DifferentialPrivacyManager,
                 performance_optimizer: PerformanceOptimizer):
        self.config = config
        self.security_manager = security_manager
        self.privacy_manager = privacy_manager
        self.performance_optimizer = performance_optimizer
        self.logger = logging.getLogger("FrameworkManager")
        
        # Framework instances
        self.frameworks: Dict[FrameworkType, BaseFramework] = {}
        self.active_framework: Optional[BaseFramework] = None
        self.current_framework_type: Optional[FrameworkType] = None
        
        # Performance tracking
        self.performance_metrics: Dict[str, Any] = {}
        
        self._initialize_frameworks()
    
    def _initialize_frameworks(self) -> None:
        """Initialize all supported frameworks."""
        try:
            # Initialize Flower framework
            flower_config = FlowerConfig(
                max_clients=self.config.max_cross_device_clients,
                privacy_budget=8.0,  # ε=8.0 differential privacy
                enable_ssl=True
            )
            
            self.frameworks[FrameworkType.FLOWER] = FlowerFramework(
                config=flower_config,
                security_manager=self.security_manager,
                privacy_manager=self.privacy_manager,
                performance_optimizer=self.performance_optimizer
            )
            
            # Initialize TFF framework
            tff_config = TFFConfig(
                max_clients=self.config.cross_silo_threshold,
                enable_secure_aggregation=True,
                adaptive_aggregation=True,
                clip_norm=1.0,
                noise_multiplier=0.1 if self.config.privacy_level == "high" else 0.0
            )
            
            self.frameworks[FrameworkType.TFF] = TFFFramework(
                config=tff_config,
                security_manager=self.security_manager,
                privacy_manager=self.privacy_manager,
                performance_optimizer=self.performance_optimizer
            )
            
            self.logger.info("All frameworks initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize frameworks: {e}")
            raise
    
    def select_framework(self, 
                        scenario_type: ScenarioType,
                        num_clients: int,
                        framework_preference: Optional[FrameworkType] = None) -> FrameworkType:
        """Select the optimal framework based on scenario and requirements."""
        try:
            # Use explicit preference if provided
            if framework_preference and framework_preference != FrameworkType.AUTO:
                selected_framework = framework_preference
                self.logger.info(f"Using explicit framework preference: {selected_framework.value}")
                return selected_framework
            
            # Auto-selection logic
            if not self.config.auto_selection_enabled:
                selected_framework = self.config.default_framework
                if selected_framework == FrameworkType.AUTO:
                    selected_framework = FrameworkType.FLOWER  # Default fallback
                self.logger.info(f"Using default framework: {selected_framework.value}")
                return selected_framework
            
            # Intelligent framework selection
            selected_framework = self._intelligent_framework_selection(scenario_type, num_clients)
            
            self.logger.info(
                f"Auto-selected framework: {selected_framework.value} "
                f"for scenario: {scenario_type.value} with {num_clients} clients"
            )
            
            return selected_framework
            
        except Exception as e:
            self.logger.error(f"Failed to select framework: {e}")
            # Fallback to Flower
            return FrameworkType.FLOWER
    
    def _intelligent_framework_selection(self, 
                                       scenario_type: ScenarioType, 
                                       num_clients: int) -> FrameworkType:
        """Intelligent framework selection based on scenario and scale."""
        
        # Cross-device scenarios: typically large number of mobile/edge devices
        if scenario_type == ScenarioType.CROSS_DEVICE:
            if num_clients > self.config.cross_silo_threshold:
                return FrameworkType.FLOWER  # Better for large-scale cross-device
            else:
                return FrameworkType.TFF  # Can handle smaller cross-device scenarios
        
        # Cross-silo scenarios: typically enterprise/organizational deployments
        elif scenario_type == ScenarioType.CROSS_SILO:
            if num_clients <= self.config.cross_silo_threshold:
                return FrameworkType.TFF  # Optimized for enterprise cross-silo
            else:
                return FrameworkType.FLOWER  # Better scalability for large cross-silo
        
        # Horizontal FL: can use either framework
        elif scenario_type == ScenarioType.HORIZONTAL:
            if num_clients > self.config.cross_silo_threshold:
                return FrameworkType.FLOWER  # Better scalability
            else:
                return FrameworkType.TFF  # Better enterprise features
        
        # Vertical FL: TFF has better support for complex data partitioning
        elif scenario_type == ScenarioType.VERTICAL:
            return FrameworkType.TFF
        
        # Auto scenario: decide based on scale primarily
        else:
            if num_clients > self.config.cross_silo_threshold:
                return FrameworkType.FLOWER
            else:
                return FrameworkType.TFF
    
    def initialize_framework(self, 
                           framework_type: FrameworkType,
                           model_fn: Callable,
                           data_fn: Callable) -> None:
        """Initialize the selected framework."""
        try:
            if framework_type not in self.frameworks:
                raise ValueError(f"Framework {framework_type.value} not available")
            
            framework = self.frameworks[framework_type]
            framework.initialize(model_fn, data_fn)
            
            self.active_framework = framework
            self.current_framework_type = framework_type
            
            self.logger.info(f"Framework {framework_type.value} initialized and activated")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize framework {framework_type.value}: {e}")
            raise
    
    def run_federated_learning(self, 
                             scenario_type: ScenarioType,
                             client_data: Union[List[Any], Dict[str, Any]],
                             model_fn: Callable,
                             data_fn: Callable,
                             num_clients: Optional[int] = None,
                             framework_preference: Optional[FrameworkType] = None,
                             **kwargs) -> TrainingMetrics:
        """Run federated learning with automatic framework selection and optimization."""
        try:
            # Determine number of clients if not provided
            if num_clients is None:
                if isinstance(client_data, list):
                    num_clients = len(client_data)
                elif isinstance(client_data, dict):
                    num_clients = len(client_data)
                else:
                    num_clients = 1
            
            # Select optimal framework
            framework_type = self.select_framework(
                scenario_type, num_clients, framework_preference
            )
            
            # Initialize framework
            self.initialize_framework(framework_type, model_fn, data_fn)
            
            # Run training based on scenario type
            metrics = self._run_scenario_specific_training(
                scenario_type, client_data, **kwargs
            )
            
            # Track performance metrics
            self._track_performance_metrics(framework_type, scenario_type, metrics)
            
            self.logger.info(f"Federated learning completed using {framework_type.value}")
            return metrics
            
        except Exception as e:
            self.logger.error(f"Failed to run federated learning: {e}")
            raise
    
    def _run_scenario_specific_training(self, 
                                      scenario_type: ScenarioType,
                                      client_data: Union[List[Any], Dict[str, Any]],
                                      **kwargs) -> TrainingMetrics:
        """Run training based on specific scenario type."""
        
        if not self.active_framework:
            raise RuntimeError("No active framework available")
        
        if self.current_framework_type == FrameworkType.FLOWER:
            return self._run_flower_training(scenario_type, client_data, **kwargs)
        elif self.current_framework_type == FrameworkType.TFF:
            return self._run_tff_training(scenario_type, client_data, **kwargs)
        else:
            raise ValueError(f"Unsupported framework type: {self.current_framework_type}")
    
    def _run_flower_training(self, 
                           scenario_type: ScenarioType,
                           client_data: Union[List[Any], Dict[str, Any]],
                           **kwargs) -> TrainingMetrics:
        """Run training using Flower framework."""
        flower_framework = self.active_framework
        
        if scenario_type in [ScenarioType.CROSS_DEVICE, ScenarioType.HORIZONTAL]:
            # Run simulation for cross-device/horizontal scenarios
            if isinstance(client_data, list):
                return flower_framework.run_simulation(
                    num_clients=len(client_data),
                    client_configs=client_data
                )
            else:
                # Convert dict to list format
                client_configs = list(client_data.values())
                return flower_framework.run_simulation(
                    num_clients=len(client_configs),
                    client_configs=client_configs
                )
        else:
            # For other scenarios, use standard simulation
            num_clients = kwargs.get('num_clients', 10)
            client_configs = kwargs.get('client_configs', [{}] * num_clients)
            return flower_framework.run_simulation(num_clients, client_configs)
    
    def _run_tff_training(self, 
                        scenario_type: ScenarioType,
                        client_data: Union[List[Any], Dict[str, Any]],
                        **kwargs) -> TrainingMetrics:
        """Run training using TFF framework."""
        tff_framework = self.active_framework
        
        if scenario_type == ScenarioType.CROSS_SILO:
            # Cross-silo training
            if isinstance(client_data, dict):
                silo_configs = kwargs.get('silo_configs', {})
                return tff_framework.run_cross_silo_training(client_data, silo_configs)
            else:
                # Convert list to dict format
                silo_data = {f"silo_{i}": data for i, data in enumerate(client_data)}
                return tff_framework.run_cross_silo_training(silo_data, {})
        
        elif scenario_type == ScenarioType.HORIZONTAL:
            # Horizontal FL
            test_data = kwargs.get('test_data')
            if isinstance(client_data, list):
                return tff_framework.run_horizontal_fl(client_data, test_data)
            else:
                client_datasets = list(client_data.values())
                return tff_framework.run_horizontal_fl(client_datasets, test_data)
        
        elif scenario_type == ScenarioType.VERTICAL:
            # Vertical FL
            if isinstance(client_data, dict) and 'features' in client_data and 'labels' in client_data:
                feature_datasets = client_data['features']
                label_dataset = client_data['labels']
                test_datasets = kwargs.get('test_data')
                return tff_framework.run_vertical_fl(feature_datasets, label_dataset, test_datasets)
            else:
                raise ValueError("Vertical FL requires 'features' and 'labels' in client_data")
        
        else:
            # Default to horizontal FL
            if isinstance(client_data, list):
                return tff_framework.run_horizontal_fl(client_data)
            else:
                client_datasets = list(client_data.values())
                return tff_framework.run_horizontal_fl(client_datasets)
    
    def _track_performance_metrics(self, 
                                 framework_type: FrameworkType,
                                 scenario_type: ScenarioType,
                                 metrics: TrainingMetrics) -> None:
        """Track performance metrics for framework optimization."""
        try:
            if not self.config.performance_monitoring:
                return
            
            key = f"{framework_type.value}_{scenario_type.value}"
            
            if key not in self.performance_metrics:
                self.performance_metrics[key] = {
                    'runs': 0,
                    'avg_convergence_rounds': 0,
                    'success_rate': 0,
                    'total_accuracy': 0
                }
            
            perf_data = self.performance_metrics[key]
            perf_data['runs'] += 1
            
            # Update convergence rounds
            if metrics.convergence_rounds:
                perf_data['avg_convergence_rounds'] = (
                    (perf_data['avg_convergence_rounds'] * (perf_data['runs'] - 1) + 
                     metrics.convergence_rounds) / perf_data['runs']
                )
            
            # Update accuracy if available
            if metrics.accuracy_history:
                final_accuracy = metrics.accuracy_history[-1]
                perf_data['total_accuracy'] = (
                    (perf_data['total_accuracy'] * (perf_data['runs'] - 1) + 
                     final_accuracy) / perf_data['runs']
                )
            
            # Update success rate (assume success if convergence_rounds > 0)
            if metrics.convergence_rounds and metrics.convergence_rounds > 0:
                success_count = perf_data['success_rate'] * (perf_data['runs'] - 1) + 1
                perf_data['success_rate'] = success_count / perf_data['runs']
            
            self.logger.debug(f"Performance metrics updated for {key}")
            
        except Exception as e:
            self.logger.warning(f"Failed to track performance metrics: {e}")
    
    def get_performance_report(self) -> Dict[str, Any]:
        """Get comprehensive performance report across all frameworks."""
        report = {
            'framework_performance': self.performance_metrics,
            'active_framework': self.current_framework_type.value if self.current_framework_type else None,
            'available_frameworks': [fw.value for fw in self.frameworks.keys()],
            'configuration': {
                'auto_selection_enabled': self.config.auto_selection_enabled,
                'max_cross_device_clients': self.config.max_cross_device_clients,
                'cross_silo_threshold': self.config.cross_silo_threshold,
                'security_level': self.config.security_level,
                'privacy_level': self.config.privacy_level
            }
        }
        
        # Add framework-specific information
        framework_info = {}
        for fw_type, framework in self.frameworks.items():
            framework_info[fw_type.value] = framework.get_framework_info()
        
        report['framework_capabilities'] = framework_info
        
        return report
    
    def get_framework_recommendations(self, 
                                    scenario_type: ScenarioType,
                                    num_clients: int,
                                    requirements: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Get framework recommendations based on requirements."""
        recommendations = {
            'primary_recommendation': None,
            'alternative_options': [],
            'reasoning': [],
            'performance_predictions': {}
        }
        
        # Primary recommendation
        primary_fw = self.select_framework(scenario_type, num_clients)
        recommendations['primary_recommendation'] = primary_fw.value
        
        # Reasoning
        if num_clients > self.config.cross_silo_threshold:
            recommendations['reasoning'].append(
                f"Large scale ({num_clients} clients) favors Flower framework"
            )
        else:
            recommendations['reasoning'].append(
                f"Enterprise scale ({num_clients} clients) suits TFF framework"
            )
        
        if scenario_type == ScenarioType.CROSS_DEVICE:
            recommendations['reasoning'].append("Cross-device scenario optimized for Flower")
        elif scenario_type == ScenarioType.CROSS_SILO:
            recommendations['reasoning'].append("Cross-silo scenario optimized for TFF")
        elif scenario_type == ScenarioType.VERTICAL:
            recommendations['reasoning'].append("Vertical FL better supported by TFF")
        
        # Alternative options
        for fw_type in self.frameworks.keys():
            if fw_type != primary_fw:
                recommendations['alternative_options'].append(fw_type.value)
        
        # Performance predictions based on historical data
        for fw_type in self.frameworks.keys():
            key = f"{fw_type.value}_{scenario_type.value}"
            if key in self.performance_metrics:
                perf_data = self.performance_metrics[key]
                recommendations['performance_predictions'][fw_type.value] = {
                    'expected_convergence_rounds': perf_data['avg_convergence_rounds'],
                    'success_probability': perf_data['success_rate'],
                    'expected_accuracy': perf_data['total_accuracy']
                }
        
        return recommendations
    
    def switch_framework(self, 
                        new_framework_type: FrameworkType,
                        model_fn: Callable,
                        data_fn: Callable) -> None:
        """Switch to a different framework."""
        try:
            if new_framework_type == self.current_framework_type:
                self.logger.info(f"Already using {new_framework_type.value} framework")
                return
            
            self.logger.info(f"Switching from {self.current_framework_type} to {new_framework_type.value}")
            
            # Initialize new framework
            self.initialize_framework(new_framework_type, model_fn, data_fn)
            
            self.logger.info(f"Successfully switched to {new_framework_type.value} framework")
            
        except Exception as e:
            self.logger.error(f"Failed to switch framework: {e}")
            raise
    
    def cleanup(self) -> None:
        """Cleanup framework resources."""
        try:
            self.active_framework = None
            self.current_framework_type = None
            
            # Framework-specific cleanup would go here
            
            self.logger.info("Framework manager cleaned up successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to cleanup framework manager: {e}")
