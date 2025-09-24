"""
Python Federated Learning Orchestrator

Main orchestration layer that coordinates federated learning operations across
different frameworks (Flower, TFF) and integrates with the TrustStram infrastructure.
"""

import asyncio
import logging
from typing import Dict, List, Optional, Tuple, Callable, Any, Union
from dataclasses import dataclass
from enum import Enum
import json
import time
from datetime import datetime, timedelta

from .frameworks.framework_manager import FrameworkManager, FrameworkManagerConfig, FrameworkType, ScenarioType
from .security.security_manager import SecurityManager
from .privacy.differential_privacy import DifferentialPrivacyManager
from .performance.performance_optimizer import PerformanceOptimizer
from .types.common_types import ModelUpdate, ClientConfig, TrainingMetrics


class JobStatus(Enum):
    """Training job status."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class FederatedJob:
    """Federated learning job configuration."""
    job_id: str
    scenario_type: ScenarioType
    framework_preference: Optional[FrameworkType] = None
    num_rounds: int = 10
    num_clients: int = 10
    min_clients_per_round: int = 5
    participation_threshold: float = 0.8
    convergence_threshold: float = 0.001
    privacy_budget: float = 8.0
    security_level: str = "high"
    model_config: Dict[str, Any] = None
    data_config: Dict[str, Any] = None
    created_at: Optional[datetime] = None
    status: JobStatus = JobStatus.PENDING


@dataclass
class FederatedJobResult:
    """Result of a federated learning job."""
    job_id: str
    status: JobStatus
    metrics: Optional[TrainingMetrics] = None
    duration_seconds: float = 0.0
    framework_used: Optional[str] = None
    error_message: Optional[str] = None
    final_model_path: Optional[str] = None


class FederatedOrchestrator:
    """Main orchestrator for federated learning operations."""
    
    def __init__(self, 
                 framework_manager: FrameworkManager,
                 security_manager: SecurityManager,
                 privacy_manager: DifferentialPrivacyManager,
                 performance_optimizer: PerformanceOptimizer):
        self.framework_manager = framework_manager
        self.security_manager = security_manager
        self.privacy_manager = privacy_manager
        self.performance_optimizer = performance_optimizer
        self.logger = logging.getLogger("FederatedOrchestrator")
        
        # Job management
        self.active_jobs: Dict[str, FederatedJob] = {}
        self.job_results: Dict[str, FederatedJobResult] = {}
        self.job_metrics: Dict[str, Dict[str, Any]] = {}
        
        # Event callbacks
        self.event_callbacks: Dict[str, List[Callable]] = {
            'job_started': [],
            'job_completed': [],
            'job_failed': [],
            'round_completed': [],
            'convergence_achieved': []
        }
        
    def initialize(self) -> None:
        """Initialize the orchestrator."""
        try:
            self.logger.info("Initializing Federated Learning Orchestrator")
            
            # Validate component initialization
            if not self.framework_manager:
                raise RuntimeError("Framework manager not available")
            
            if not self.security_manager:
                raise RuntimeError("Security manager not available")
            
            self.logger.info("Federated Learning Orchestrator initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize orchestrator: {e}")
            raise
    
    def register_event_callback(self, event_type: str, callback: Callable) -> None:
        """Register event callback."""
        if event_type in self.event_callbacks:
            self.event_callbacks[event_type].append(callback)
        else:
            self.logger.warning(f"Unknown event type: {event_type}")
    
    def _emit_event(self, event_type: str, data: Dict[str, Any]) -> None:
        """Emit event to registered callbacks."""
        for callback in self.event_callbacks.get(event_type, []):
            try:
                callback(data)
            except Exception as e:
                self.logger.error(f"Error in event callback for {event_type}: {e}")
    
    def create_job(self, 
                   scenario_type: ScenarioType,
                   num_clients: int,
                   model_fn: Callable,
                   data_fn: Callable,
                   job_config: Optional[Dict[str, Any]] = None) -> str:
        """Create a new federated learning job."""
        try:
            # Generate unique job ID
            job_id = f"fl_job_{int(time.time())}_{len(self.active_jobs)}"
            
            # Create job configuration
            job = FederatedJob(
                job_id=job_id,
                scenario_type=scenario_type,
                num_clients=num_clients,
                created_at=datetime.now()
            )
            
            # Apply custom configuration if provided
            if job_config:
                for key, value in job_config.items():
                    if hasattr(job, key):
                        setattr(job, key, value)
            
            # Store model and data functions
            self.job_metrics[job_id] = {
                'model_fn': model_fn,
                'data_fn': data_fn,
                'creation_time': time.time()
            }
            
            # Register job
            self.active_jobs[job_id] = job
            
            self.logger.info(f"Created federated learning job {job_id}")
            return job_id
            
        except Exception as e:
            self.logger.error(f"Failed to create job: {e}")
            raise
    
    async def execute_job(self, job_id: str) -> FederatedJobResult:
        """Execute a federated learning job."""
        start_time = time.time()
        
        try:
            job = self.active_jobs.get(job_id)
            if not job:
                raise ValueError(f"Job {job_id} not found")
            
            # Update job status
            job.status = JobStatus.RUNNING
            
            self.logger.info(f"Starting execution of job {job_id}")
            
            # Emit job started event
            self._emit_event('job_started', {
                'job_id': job_id,
                'scenario_type': job.scenario_type.value,
                'num_clients': job.num_clients,
                'timestamp': datetime.now().isoformat()
            })
            
            # Get model and data functions
            job_meta = self.job_metrics[job_id]
            model_fn = job_meta['model_fn']
            data_fn = job_meta['data_fn']
            
            # Prepare client data
            client_data = self._prepare_client_data(job, data_fn)
            
            # Get framework recommendations
            recommendations = self.framework_manager.get_framework_recommendations(
                job.scenario_type, job.num_clients
            )
            
            self.logger.info(f"Framework recommendation for job {job_id}: {recommendations}")
            
            # Execute federated learning
            metrics = await self._execute_federated_training(
                job, model_fn, data_fn, client_data
            )
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Create result
            result = FederatedJobResult(
                job_id=job_id,
                status=JobStatus.COMPLETED,
                metrics=metrics,
                duration_seconds=duration,
                framework_used=self.framework_manager.current_framework_type.value if self.framework_manager.current_framework_type else None
            )
            
            # Update job status
            job.status = JobStatus.COMPLETED
            
            # Store result
            self.job_results[job_id] = result
            
            # Emit completion event
            self._emit_event('job_completed', {
                'job_id': job_id,
                'duration_seconds': duration,
                'convergence_rounds': metrics.convergence_rounds if metrics else None,
                'final_accuracy': metrics.accuracy_history[-1] if metrics and metrics.accuracy_history else None,
                'timestamp': datetime.now().isoformat()
            })
            
            self.logger.info(f"Job {job_id} completed successfully in {duration:.2f} seconds")
            return result
            
        except Exception as e:
            duration = time.time() - start_time
            error_msg = str(e)
            
            # Create failure result
            result = FederatedJobResult(
                job_id=job_id,
                status=JobStatus.FAILED,
                duration_seconds=duration,
                error_message=error_msg
            )
            
            # Update job status
            if job_id in self.active_jobs:
                self.active_jobs[job_id].status = JobStatus.FAILED
            
            # Store result
            self.job_results[job_id] = result
            
            # Emit failure event
            self._emit_event('job_failed', {
                'job_id': job_id,
                'error_message': error_msg,
                'duration_seconds': duration,
                'timestamp': datetime.now().isoformat()
            })
            
            self.logger.error(f"Job {job_id} failed: {error_msg}")
            return result
    
    def _prepare_client_data(self, job: FederatedJob, data_fn: Callable) -> Union[List[Any], Dict[str, Any]]:
        """Prepare client data based on scenario type."""
        try:
            if job.scenario_type == ScenarioType.CROSS_SILO:
                # Cross-silo: organize data by silos
                client_data = {}
                for i in range(job.num_clients):
                    silo_id = f"silo_{i}"
                    client_data[silo_id] = data_fn(silo_id, {"silo_config": True})
                return client_data
            
            elif job.scenario_type == ScenarioType.VERTICAL:
                # Vertical FL: separate features and labels
                feature_datasets = []
                for i in range(job.num_clients - 1):  # Last client has labels
                    features = data_fn(f"client_{i}", {"data_type": "features"})
                    feature_datasets.append(features)
                
                labels = data_fn(f"client_{job.num_clients-1}", {"data_type": "labels"})
                
                return {
                    "features": feature_datasets,
                    "labels": labels
                }
            
            else:
                # Horizontal FL and cross-device: list of client datasets
                client_data = []
                for i in range(job.num_clients):
                    client_config = {"client_id": f"client_{i}"}
                    client_data.append(data_fn(f"client_{i}", client_config))
                return client_data
                
        except Exception as e:
            self.logger.error(f"Failed to prepare client data: {e}")
            raise
    
    async def _execute_federated_training(self, 
                                        job: FederatedJob,
                                        model_fn: Callable,
                                        data_fn: Callable,
                                        client_data: Union[List[Any], Dict[str, Any]]) -> TrainingMetrics:
        """Execute the federated training process."""
        try:
            # Configure framework manager based on job requirements
            fm_config = FrameworkManagerConfig(
                default_framework=job.framework_preference or FrameworkType.AUTO,
                max_cross_device_clients=15000000,
                cross_silo_threshold=1000,
                security_level=job.security_level,
                privacy_level="high" if job.privacy_budget <= 1.0 else "medium"
            )
            
            # Update framework manager configuration
            self.framework_manager.config = fm_config
            
            # Execute federated learning
            metrics = self.framework_manager.run_federated_learning(
                scenario_type=job.scenario_type,
                client_data=client_data,
                model_fn=model_fn,
                data_fn=data_fn,
                num_clients=job.num_clients,
                framework_preference=job.framework_preference,
                num_rounds=job.num_rounds,
                privacy_budget=job.privacy_budget,
                convergence_threshold=job.convergence_threshold
            )
            
            return metrics
            
        except Exception as e:
            self.logger.error(f"Failed to execute federated training: {e}")
            raise
    
    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get current status of a job."""
        if job_id in self.active_jobs:
            job = self.active_jobs[job_id]
            status_info = {
                'job_id': job_id,
                'status': job.status.value,
                'scenario_type': job.scenario_type.value,
                'num_clients': job.num_clients,
                'created_at': job.created_at.isoformat() if job.created_at else None
            }
            
            # Add result info if available
            if job_id in self.job_results:
                result = self.job_results[job_id]
                status_info.update({
                    'duration_seconds': result.duration_seconds,
                    'framework_used': result.framework_used,
                    'error_message': result.error_message
                })
            
            return status_info
        
        return None
    
    def list_jobs(self, status_filter: Optional[JobStatus] = None) -> List[Dict[str, Any]]:
        """List all jobs, optionally filtered by status."""
        jobs = []
        for job_id, job in self.active_jobs.items():
            if status_filter is None or job.status == status_filter:
                job_info = self.get_job_status(job_id)
                if job_info:
                    jobs.append(job_info)
        
        return jobs
    
    def cancel_job(self, job_id: str) -> bool:
        """Cancel a running job."""
        try:
            if job_id in self.active_jobs:
                job = self.active_jobs[job_id]
                if job.status == JobStatus.RUNNING:
                    job.status = JobStatus.CANCELLED
                    
                    # Create cancellation result
                    result = FederatedJobResult(
                        job_id=job_id,
                        status=JobStatus.CANCELLED
                    )
                    self.job_results[job_id] = result
                    
                    self.logger.info(f"Job {job_id} cancelled")
                    return True
                else:
                    self.logger.warning(f"Job {job_id} is not running, cannot cancel")
                    return False
            else:
                self.logger.warning(f"Job {job_id} not found")
                return False
                
        except Exception as e:
            self.logger.error(f"Failed to cancel job {job_id}: {e}")
            return False
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary across all jobs."""
        try:
            completed_jobs = [job for job in self.active_jobs.values() if job.status == JobStatus.COMPLETED]
            failed_jobs = [job for job in self.active_jobs.values() if job.status == JobStatus.FAILED]
            
            total_jobs = len(self.active_jobs)
            success_rate = len(completed_jobs) / total_jobs if total_jobs > 0 else 0
            
            avg_duration = 0
            if completed_jobs:
                total_duration = sum(
                    self.job_results[job.job_id].duration_seconds 
                    for job in completed_jobs 
                    if job.job_id in self.job_results
                )
                avg_duration = total_duration / len(completed_jobs)
            
            framework_performance = self.framework_manager.get_performance_report()
            
            summary = {
                'total_jobs': total_jobs,
                'completed_jobs': len(completed_jobs),
                'failed_jobs': len(failed_jobs),
                'success_rate': success_rate,
                'average_duration_seconds': avg_duration,
                'framework_performance': framework_performance,
                'job_distribution': {
                    scenario.value: len([
                        job for job in self.active_jobs.values() 
                        if job.scenario_type == scenario
                    ])
                    for scenario in ScenarioType
                }
            }
            
            return summary
            
        except Exception as e:
            self.logger.error(f"Failed to generate performance summary: {e}")
            return {}
    
    def export_job_results(self, job_id: str, format: str = "json") -> str:
        """Export job results in specified format."""
        try:
            if job_id not in self.job_results:
                raise ValueError(f"No results available for job {job_id}")
            
            result = self.job_results[job_id]
            
            if format.lower() == "json":
                # Convert result to JSON-serializable format
                export_data = {
                    'job_id': result.job_id,
                    'status': result.status.value,
                    'duration_seconds': result.duration_seconds,
                    'framework_used': result.framework_used,
                    'error_message': result.error_message,
                    'final_model_path': result.final_model_path
                }
                
                if result.metrics:
                    export_data['metrics'] = {
                        'convergence_rounds': result.metrics.convergence_rounds,
                        'final_loss': result.metrics.loss_history[-1] if result.metrics.loss_history else None,
                        'final_accuracy': result.metrics.accuracy_history[-1] if result.metrics.accuracy_history else None,
                        'loss_history': result.metrics.loss_history,
                        'accuracy_history': result.metrics.accuracy_history
                    }
                
                return json.dumps(export_data, indent=2)
            
            else:
                raise ValueError(f"Unsupported export format: {format}")
                
        except Exception as e:
            self.logger.error(f"Failed to export job results: {e}")
            raise
    
    def cleanup(self) -> None:
        """Clean up orchestrator resources."""
        try:
            # Cancel any running jobs
            for job_id, job in self.active_jobs.items():
                if job.status == JobStatus.RUNNING:
                    self.cancel_job(job_id)
            
            # Cleanup framework manager
            if self.framework_manager:
                self.framework_manager.cleanup()
            
            self.logger.info("Federated orchestrator cleaned up successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to cleanup orchestrator: {e}")


# Factory function for easy orchestrator creation
def create_federated_orchestrator(security_level: str = "high",
                                privacy_level: str = "medium",
                                performance_optimization: bool = True) -> FederatedOrchestrator:
    """Create a configured federated learning orchestrator."""
    
    # Create component managers
    security_manager = SecurityManager()
    privacy_manager = DifferentialPrivacyManager()
    performance_optimizer = PerformanceOptimizer() if performance_optimization else None
    
    # Create framework manager
    fm_config = FrameworkManagerConfig(
        security_level=security_level,
        privacy_level=privacy_level,
        performance_monitoring=True
    )
    
    framework_manager = FrameworkManager(
        config=fm_config,
        security_manager=security_manager,
        privacy_manager=privacy_manager,
        performance_optimizer=performance_optimizer
    )
    
    # Create orchestrator
    orchestrator = FederatedOrchestrator(
        framework_manager=framework_manager,
        security_manager=security_manager,
        privacy_manager=privacy_manager,
        performance_optimizer=performance_optimizer
    )
    
    # Initialize
    orchestrator.initialize()
    
    return orchestrator
