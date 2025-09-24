"""
Flower Framework Integration for Cross-Device Federated Learning

Implements Flower-based federated learning with support for:
- Large-scale cross-device scenarios (up to 15M clients)
- Privacy-preserving techniques integration
- Byzantine-robust aggregation
- Communication optimization
"""

import flwr as fl
import numpy as np
import logging
from typing import Dict, List, Optional, Tuple, Callable, Any
from dataclasses import dataclass
import threading
import asyncio
from concurrent.futures import ThreadPoolExecutor

from ..core.base_framework import BaseFramework
from ..security.security_manager import SecurityManager
from ..privacy.differential_privacy import DifferentialPrivacyManager
from ..performance.performance_optimizer import PerformanceOptimizer
from ..types.common_types import ModelUpdate, ClientConfig, TrainingMetrics


@dataclass
class FlowerConfig:
    """Configuration for Flower framework."""
    num_rounds: int = 10
    min_fit_clients: int = 2
    min_evaluate_clients: int = 2
    min_available_clients: int = 2
    fraction_fit: float = 0.1
    fraction_evaluate: float = 0.1
    server_address: str = "localhost:8080"
    max_clients: int = 15000000  # 15M client scalability
    enable_ssl: bool = True
    privacy_budget: float = 8.0  # ε=8.0 differential privacy
    

class FlowerClient(fl.client.NumPyClient):
    """Enhanced Flower client with privacy and security features."""
    
    def __init__(self, 
                 model: Any, 
                 trainloader: Any, 
                 valloader: Any,
                 client_id: str,
                 security_manager: SecurityManager,
                 privacy_manager: DifferentialPrivacyManager):
        self.model = model
        self.trainloader = trainloader
        self.valloader = valloader
        self.client_id = client_id
        self.security_manager = security_manager
        self.privacy_manager = privacy_manager
        self.logger = logging.getLogger(f"FlowerClient_{client_id}")
        
    def get_parameters(self, config: Dict[str, Any]) -> List[np.ndarray]:
        """Return model parameters as a list of NumPy arrays."""
        try:
            parameters = [val.cpu().numpy() for _, val in self.model.state_dict().items()]
            
            # Apply differential privacy noise
            if self.privacy_manager:
                parameters = self.privacy_manager.add_noise_to_parameters(parameters)
                
            return parameters
        except Exception as e:
            self.logger.error(f"Error getting parameters: {e}")
            return []
    
    def set_parameters(self, parameters: List[np.ndarray]) -> None:
        """Set model parameters from a list of NumPy arrays."""
        try:
            params_dict = zip(self.model.state_dict().keys(), parameters)
            state_dict = {k: torch.tensor(v) for k, v in params_dict}
            self.model.load_state_dict(state_dict, strict=True)
        except Exception as e:
            self.logger.error(f"Error setting parameters: {e}")
    
    def fit(self, parameters: List[np.ndarray], config: Dict[str, Any]) -> Tuple[List[np.ndarray], int, Dict]:
        """Train the model on the locally held training set."""
        try:
            self.set_parameters(parameters)
            
            # Extract training configuration
            epochs = config.get("epochs", 1)
            batch_size = config.get("batch_size", 32)
            learning_rate = config.get("learning_rate", 0.01)
            
            # Perform local training
            train_loss, train_accuracy = self._train(epochs, batch_size, learning_rate)
            
            # Get updated parameters
            updated_parameters = self.get_parameters({})
            
            # Apply security checks
            if self.security_manager:
                is_valid = self.security_manager.validate_update(
                    ModelUpdate(
                        client_id=self.client_id,
                        parameters=updated_parameters,
                        metrics={"loss": train_loss, "accuracy": train_accuracy}
                    )
                )
                if not is_valid:
                    self.logger.warning(f"Security validation failed for client {self.client_id}")
                    return parameters, 0, {}  # Return original parameters if invalid
            
            return updated_parameters, len(self.trainloader.dataset), {
                "loss": train_loss,
                "accuracy": train_accuracy,
                "client_id": self.client_id
            }
            
        except Exception as e:
            self.logger.error(f"Error during training: {e}")
            return parameters, 0, {"error": str(e)}
    
    def evaluate(self, parameters: List[np.ndarray], config: Dict[str, Any]) -> Tuple[float, int, Dict]:
        """Evaluate the model on the locally held validation set."""
        try:
            self.set_parameters(parameters)
            loss, accuracy = self._evaluate()
            
            return loss, len(self.valloader.dataset), {
                "accuracy": accuracy,
                "client_id": self.client_id
            }
            
        except Exception as e:
            self.logger.error(f"Error during evaluation: {e}")
            return float('inf'), 0, {"error": str(e)}
    
    def _train(self, epochs: int, batch_size: int, learning_rate: float) -> Tuple[float, float]:
        """Internal training method."""
        import torch
        import torch.nn as nn
        import torch.optim as optim
        
        self.model.train()
        criterion = nn.CrossEntropyLoss()
        optimizer = optim.SGD(self.model.parameters(), lr=learning_rate, momentum=0.9)
        
        total_loss = 0.0
        correct = 0
        total = 0
        
        for epoch in range(epochs):
            for batch_idx, (data, target) in enumerate(self.trainloader):
                optimizer.zero_grad()
                output = self.model(data)
                loss = criterion(output, target)
                loss.backward()
                optimizer.step()
                
                total_loss += loss.item()
                _, predicted = output.max(1)
                total += target.size(0)
                correct += predicted.eq(target).sum().item()
        
        avg_loss = total_loss / len(self.trainloader)
        accuracy = 100.0 * correct / total
        
        return avg_loss, accuracy
    
    def _evaluate(self) -> Tuple[float, float]:
        """Internal evaluation method."""
        import torch
        import torch.nn as nn
        
        self.model.eval()
        criterion = nn.CrossEntropyLoss()
        
        test_loss = 0.0
        correct = 0
        total = 0
        
        with torch.no_grad():
            for data, target in self.valloader:
                output = self.model(data)
                test_loss += criterion(output, target).item()
                _, predicted = output.max(1)
                total += target.size(0)
                correct += predicted.eq(target).sum().item()
        
        avg_loss = test_loss / len(self.valloader)
        accuracy = 100.0 * correct / total
        
        return avg_loss, accuracy


class FlowerAggregationStrategy(fl.server.strategy.FedAvg):
    """Enhanced aggregation strategy with security and privacy features."""
    
    def __init__(self,
                 security_manager: SecurityManager,
                 privacy_manager: DifferentialPrivacyManager,
                 performance_optimizer: PerformanceOptimizer,
                 **kwargs):
        super().__init__(**kwargs)
        self.security_manager = security_manager
        self.privacy_manager = privacy_manager
        self.performance_optimizer = performance_optimizer
        self.logger = logging.getLogger("FlowerAggregationStrategy")
        
    def aggregate_fit(self, server_round: int, results: List[Tuple], failures: List[BaseException]) -> Optional[Tuple]:
        """Aggregate fit results with enhanced security and privacy."""
        if not results:
            return None
            
        try:
            # Extract client updates
            client_updates = []
            for client_proxy, fit_res in results:
                if fit_res is not None:
                    client_id = fit_res.metrics.get("client_id", "unknown")
                    update = ModelUpdate(
                        client_id=client_id,
                        parameters=fit_res.parameters,
                        metrics=fit_res.metrics,
                        num_examples=fit_res.num_examples
                    )
                    client_updates.append(update)
            
            # Apply security filtering (WFAgg Byzantine-robust aggregation)
            if self.security_manager:
                filtered_updates = self.security_manager.filter_byzantine_updates(client_updates)
                self.logger.info(f"Filtered {len(client_updates) - len(filtered_updates)} potential Byzantine updates")
                client_updates = filtered_updates
            
            # Perform aggregation
            if not client_updates:
                self.logger.warning("No valid updates after security filtering")
                return None
                
            # Use performance optimizer for efficient aggregation
            if self.performance_optimizer:
                aggregated_parameters = self.performance_optimizer.aggregate_parameters(
                    [update.parameters for update in client_updates],
                    [update.num_examples for update in client_updates]
                )
            else:
                # Fallback to weighted average
                aggregated_parameters = self._weighted_average(
                    [(update.parameters, update.num_examples) for update in client_updates]
                )
            
            # Apply differential privacy
            if self.privacy_manager:
                aggregated_parameters = self.privacy_manager.apply_server_noise(
                    aggregated_parameters, server_round
                )
            
            # Prepare aggregated metrics
            aggregated_metrics = self._aggregate_metrics([update.metrics for update in client_updates])
            
            return aggregated_parameters, aggregated_metrics
            
        except Exception as e:
            self.logger.error(f"Error during aggregation: {e}")
            return None
    
    def _weighted_average(self, parameters_list: List[Tuple[List[np.ndarray], int]]) -> List[np.ndarray]:
        """Compute weighted average of parameters."""
        if not parameters_list:
            return []
            
        total_examples = sum(num_examples for _, num_examples in parameters_list)
        
        # Initialize with zeros
        first_params, _ = parameters_list[0]
        weighted_params = [np.zeros_like(param) for param in first_params]
        
        # Compute weighted sum
        for params, num_examples in parameters_list:
            weight = num_examples / total_examples
            for i, param in enumerate(params):
                weighted_params[i] += weight * param
                
        return weighted_params
    
    def _aggregate_metrics(self, metrics_list: List[Dict]) -> Dict:
        """Aggregate client metrics."""
        if not metrics_list:
            return {}
            
        aggregated = {}
        for metrics in metrics_list:
            for key, value in metrics.items():
                if isinstance(value, (int, float)):
                    if key not in aggregated:
                        aggregated[key] = []
                    aggregated[key].append(value)
        
        # Compute averages
        for key, values in aggregated.items():
            aggregated[key] = np.mean(values) if values else 0.0
            
        return aggregated


class FlowerFramework(BaseFramework):
    """Flower framework implementation for cross-device federated learning."""
    
    def __init__(self, 
                 config: FlowerConfig,
                 security_manager: SecurityManager,
                 privacy_manager: DifferentialPrivacyManager,
                 performance_optimizer: PerformanceOptimizer):
        super().__init__()
        self.config = config
        self.security_manager = security_manager
        self.privacy_manager = privacy_manager
        self.performance_optimizer = performance_optimizer
        self.logger = logging.getLogger("FlowerFramework")
        self.server = None
        self.client_manager = None
        
    def initialize(self, model_fn: Callable, data_fn: Callable) -> None:
        """Initialize the Flower framework."""
        try:
            self.model_fn = model_fn
            self.data_fn = data_fn
            
            # Create aggregation strategy
            self.strategy = FlowerAggregationStrategy(
                security_manager=self.security_manager,
                privacy_manager=self.privacy_manager,
                performance_optimizer=self.performance_optimizer,
                fraction_fit=self.config.fraction_fit,
                fraction_evaluate=self.config.fraction_evaluate,
                min_fit_clients=self.config.min_fit_clients,
                min_evaluate_clients=self.config.min_evaluate_clients,
                min_available_clients=self.config.min_available_clients
            )
            
            self.logger.info("Flower framework initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Flower framework: {e}")
            raise
    
    def start_server(self) -> None:
        """Start the Flower server."""
        try:
            # Configure server
            server_config = fl.server.ServerConfig(num_rounds=self.config.num_rounds)
            
            # Start server
            self.logger.info(f"Starting Flower server on {self.config.server_address}")
            fl.server.start_server(
                server_address=self.config.server_address,
                config=server_config,
                strategy=self.strategy
            )
            
        except Exception as e:
            self.logger.error(f"Failed to start Flower server: {e}")
            raise
    
    def create_client(self, client_id: str, data_config: Dict[str, Any]) -> FlowerClient:
        """Create a Flower client instance."""
        try:
            # Create model and data loaders
            model = self.model_fn()
            trainloader, valloader = self.data_fn(client_id, data_config)
            
            # Create client
            client = FlowerClient(
                model=model,
                trainloader=trainloader,
                valloader=valloader,
                client_id=client_id,
                security_manager=self.security_manager,
                privacy_manager=self.privacy_manager
            )
            
            self.logger.info(f"Created Flower client {client_id}")
            return client
            
        except Exception as e:
            self.logger.error(f"Failed to create client {client_id}: {e}")
            raise
    
    def start_client(self, client: FlowerClient) -> None:
        """Start a Flower client."""
        try:
            fl.client.start_numpy_client(
                server_address=self.config.server_address,
                client=client
            )
            
        except Exception as e:
            self.logger.error(f"Failed to start client {client.client_id}: {e}")
            raise
    
    def run_simulation(self, num_clients: int, client_configs: List[Dict[str, Any]]) -> TrainingMetrics:
        """Run federated learning simulation."""
        try:
            # Create client function for simulation
            def client_fn(cid: str) -> FlowerClient:
                client_config = client_configs[int(cid)] if int(cid) < len(client_configs) else {}
                return self.create_client(cid, client_config)
            
            # Run simulation
            self.logger.info(f"Starting FL simulation with {num_clients} clients")
            history = fl.simulation.start_simulation(
                client_fn=client_fn,
                num_clients=num_clients,
                config=fl.server.ServerConfig(num_rounds=self.config.num_rounds),
                strategy=self.strategy
            )
            
            # Extract metrics
            metrics = TrainingMetrics(
                round_metrics=history.metrics_distributed,
                loss_history=history.losses_distributed,
                accuracy_history=history.metrics_distributed.get("accuracy", []),
                convergence_rounds=len(history.losses_distributed)
            )
            
            self.logger.info("FL simulation completed successfully")
            return metrics
            
        except Exception as e:
            self.logger.error(f"Failed to run simulation: {e}")
            raise
    
    def get_framework_info(self) -> Dict[str, Any]:
        """Get framework information."""
        return {
            "name": "Flower",
            "type": "cross-device",
            "max_clients": self.config.max_clients,
            "scalability": "15M clients",
            "privacy_enabled": self.privacy_manager is not None,
            "security_enabled": self.security_manager is not None,
            "performance_optimized": self.performance_optimizer is not None
        }
