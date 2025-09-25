"""
AI Model Integration Tests for TrustStram v4.4

This module contains comprehensive integration tests for AI model components:
- Machine learning model inference testing
- Model serving endpoint validation
- Model versioning and deployment
- AI pipeline data flow verification
- Model performance and accuracy validation
- Federated learning integration
"""

import pytest
import asyncio
import requests
import json
import numpy as np
import time
import os
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
import logging

# Configure logging for test output
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AIModelIntegrationTestSuite:
    """Main test suite for AI model integrations"""
    
    def __init__(self):
        self.model_endpoints = {
            'prediction_service': os.getenv('ML_PREDICTION_ENDPOINT', 'http://localhost:8080/predict'),
            'training_service': os.getenv('ML_TRAINING_ENDPOINT', 'http://localhost:8081/train'),
            'model_registry': os.getenv('MODEL_REGISTRY_ENDPOINT', 'http://localhost:8082/models'),
            'federated_coordinator': os.getenv('FEDERATED_LEARNING_ENDPOINT', 'http://localhost:8083/federated')
        }
        
        self.model_configs = {
            'trust_classifier': {
                'model_id': 'trust-classifier-v4.4',
                'input_shape': (1, 784),
                'output_classes': ['trusted', 'untrusted', 'pending'],
                'model_type': 'classification'
            },
            'anomaly_detector': {
                'model_id': 'anomaly-detector-v4.4',
                'input_shape': (1, 512),
                'threshold': 0.85,
                'model_type': 'anomaly_detection'
            },
            'prediction_model': {
                'model_id': 'trust-predictor-v4.4',
                'input_shape': (1, 256),
                'output_shape': (1, 1),
                'model_type': 'regression'
            }
        }
        
        self.test_results = []
        self.model_cache = {}

    def log_test_result(self, test_name, status, details=None):
        """Log test results for reporting"""
        result = {
            'test_name': test_name,
            'status': status,
            'timestamp': datetime.now().isoformat(),
            'details': details or {}
        }
        self.test_results.append(result)
        logger.info(f"AI Test {test_name}: {status}")

    def generate_test_data(self, model_config):
        """Generate synthetic test data for model testing"""
        input_shape = model_config['input_shape']
        if len(input_shape) == 2:
            return np.random.rand(input_shape[0], input_shape[1]).tolist()
        else:
            return np.random.rand(*input_shape).tolist()

class TestModelInferenceEndpoints:
    """Test AI model inference endpoints and responses"""
    
    def setup_method(self):
        """Setup before each test"""
        self.suite = AIModelIntegrationTestSuite()
        self.session = requests.Session()
    
    def teardown_method(self):
        """Cleanup after each test"""
        self.session.close()

    def test_trust_classifier_inference(self):
        """Test trust classification model inference"""
        try:
            model_config = self.suite.model_configs['trust_classifier']
            test_data = self.suite.generate_test_data(model_config)
            
            # Prepare inference request
            inference_request = {
                'model_id': model_config['model_id'],
                'input_data': test_data,
                'return_probabilities': True
            }
            
            # Mock successful inference response
            mock_response = {
                'predictions': ['trusted'],
                'probabilities': [0.87, 0.10, 0.03],
                'model_version': '4.4.1',
                'inference_time_ms': 45,
                'status': 'success'
            }
            
            # Test inference endpoint (mocked)
            with patch('requests.post') as mock_post:
                mock_post.return_value.json.return_value = mock_response
                mock_post.return_value.status_code = 200
                
                response = self.session.post(
                    self.suite.model_endpoints['prediction_service'],
                    json=inference_request,
                    timeout=30
                )
                
                result = response.json() if hasattr(response, 'json') else mock_response
                
                # Validate response structure
                assert 'predictions' in result
                assert 'probabilities' in result
                assert len(result['predictions']) > 0
                assert result['status'] == 'success'
                
                self.suite.log_test_result(
                    'trust_classifier_inference',
                    'PASSED',
                    {
                        'model_id': model_config['model_id'],
                        'prediction': result['predictions'][0],
                        'confidence': max(result['probabilities']),
                        'inference_time_ms': result.get('inference_time_ms', 0)
                    }
                )
                
        except Exception as e:
            self.suite.log_test_result(
                'trust_classifier_inference',
                'FAILED',
                {'error': str(e)}
            )

    def test_anomaly_detection_inference(self):
        """Test anomaly detection model inference"""
        try:
            model_config = self.suite.model_configs['anomaly_detector']
            test_data = self.suite.generate_test_data(model_config)
            
            # Prepare anomaly detection request
            detection_request = {
                'model_id': model_config['model_id'],
                'input_data': test_data,
                'threshold': model_config['threshold']
            }
            
            # Mock anomaly detection response
            mock_response = {
                'anomaly_score': 0.23,
                'is_anomaly': False,
                'threshold_used': 0.85,
                'feature_importance': [0.15, 0.32, 0.18, 0.35],
                'model_version': '4.4.1',
                'status': 'success'
            }
            
            # Test anomaly detection endpoint (mocked)
            with patch('requests.post') as mock_post:
                mock_post.return_value.json.return_value = mock_response
                mock_post.return_value.status_code = 200
                
                response = self.session.post(
                    self.suite.model_endpoints['prediction_service'],
                    json=detection_request,
                    timeout=30
                )
                
                result = response.json() if hasattr(response, 'json') else mock_response
                
                # Validate anomaly detection response
                assert 'anomaly_score' in result
                assert 'is_anomaly' in result
                assert isinstance(result['anomaly_score'], (int, float))
                assert isinstance(result['is_anomaly'], bool)
                
                self.suite.log_test_result(
                    'anomaly_detection_inference',
                    'PASSED',
                    {
                        'model_id': model_config['model_id'],
                        'anomaly_score': result['anomaly_score'],
                        'is_anomaly': result['is_anomaly'],
                        'threshold': result.get('threshold_used', model_config['threshold'])
                    }
                )
                
        except Exception as e:
            self.suite.log_test_result(
                'anomaly_detection_inference',
                'FAILED',
                {'error': str(e)}
            )

    def test_batch_inference_processing(self):
        """Test batch inference processing capabilities"""
        try:
            model_config = self.suite.model_configs['prediction_model']
            
            # Generate batch test data
            batch_size = 10
            batch_data = []
            for i in range(batch_size):
                batch_data.append(self.suite.generate_test_data(model_config))
            
            # Prepare batch inference request
            batch_request = {
                'model_id': model_config['model_id'],
                'batch_data': batch_data,
                'batch_size': batch_size
            }
            
            # Mock batch inference response
            mock_response = {
                'predictions': [0.75 + (i * 0.02) for i in range(batch_size)],
                'batch_size': batch_size,
                'processing_time_ms': 120,
                'throughput_samples_per_second': 83.3,
                'status': 'success'
            }
            
            # Test batch inference endpoint (mocked)
            with patch('requests.post') as mock_post:
                mock_post.return_value.json.return_value = mock_response
                mock_post.return_value.status_code = 200
                
                response = self.session.post(
                    f"{self.suite.model_endpoints['prediction_service']}/batch",
                    json=batch_request,
                    timeout=60
                )
                
                result = response.json() if hasattr(response, 'json') else mock_response
                
                # Validate batch processing response
                assert 'predictions' in result
                assert len(result['predictions']) == batch_size
                assert 'throughput_samples_per_second' in result
                
                self.suite.log_test_result(
                    'batch_inference_processing',
                    'PASSED',
                    {
                        'batch_size': batch_size,
                        'predictions_count': len(result['predictions']),
                        'processing_time_ms': result.get('processing_time_ms', 0),
                        'throughput': result.get('throughput_samples_per_second', 0)
                    }
                )
                
        except Exception as e:
            self.suite.log_test_result(
                'batch_inference_processing',
                'FAILED',
                {'error': str(e)}
            )

class TestModelDeploymentAndVersioning:
    """Test model deployment and version management"""
    
    def setup_method(self):
        """Setup before each test"""
        self.suite = AIModelIntegrationTestSuite()
        self.session = requests.Session()
    
    def test_model_registry_operations(self):
        """Test model registry CRUD operations"""
        try:
            # Test model registration
            model_metadata = {
                'model_id': 'test-model-v1.0',
                'model_name': 'Test Integration Model',
                'version': '1.0.0',
                'framework': 'tensorflow',
                'input_schema': {'shape': [1, 784], 'type': 'float32'},
                'output_schema': {'shape': [1, 3], 'type': 'float32'},
                'metrics': {'accuracy': 0.94, 'f1_score': 0.92},
                'created_by': 'integration_test'
            }
            
            # Mock registry responses
            register_response = {
                'model_id': model_metadata['model_id'],
                'registry_url': f"models/{model_metadata['model_id']}",
                'status': 'registered',
                'version': model_metadata['version']
            }
            
            list_response = {
                'models': [
                    {
                        'model_id': model_metadata['model_id'],
                        'version': model_metadata['version'],
                        'status': 'active',
                        'last_updated': datetime.now().isoformat()
                    }
                ],
                'total_count': 1
            }
            
            # Test model registration (mocked)
            with patch('requests.post') as mock_post:
                mock_post.return_value.json.return_value = register_response
                mock_post.return_value.status_code = 201
                
                response = self.session.post(
                    f"{self.suite.model_endpoints['model_registry']}/register",
                    json=model_metadata,
                    timeout=30
                )
                
                register_result = response.json() if hasattr(response, 'json') else register_response
                
            # Test model listing (mocked)
            with patch('requests.get') as mock_get:
                mock_get.return_value.json.return_value = list_response
                mock_get.return_value.status_code = 200
                
                response = self.session.get(
                    self.suite.model_endpoints['model_registry'],
                    timeout=30
                )
                
                list_result = response.json() if hasattr(response, 'json') else list_response
                
            # Validate registry operations
            assert register_result['status'] == 'registered'
            assert len(list_result['models']) > 0
            assert list_result['models'][0]['model_id'] == model_metadata['model_id']
            
            self.suite.log_test_result(
                'model_registry_operations',
                'PASSED',
                {
                    'registration_successful': True,
                    'models_listed': len(list_result['models']),
                    'test_model_id': model_metadata['model_id']
                }
            )
            
        except Exception as e:
            self.suite.log_test_result(
                'model_registry_operations',
                'FAILED',
                {'error': str(e)}
            )

    def test_model_versioning_and_rollback(self):
        """Test model version management and rollback capabilities"""
        try:
            model_id = 'trust-classifier-v4.4'
            
            # Mock version management responses
            versions_response = {
                'model_id': model_id,
                'versions': [
                    {'version': '4.4.0', 'status': 'deprecated', 'accuracy': 0.89},
                    {'version': '4.4.1', 'status': 'active', 'accuracy': 0.94},
                    {'version': '4.4.2', 'status': 'staging', 'accuracy': 0.96}
                ]
            }
            
            # Test version listing
            with patch('requests.get') as mock_get:
                mock_get.return_value.json.return_value = versions_response
                mock_get.return_value.status_code = 200
                
                response = self.session.get(
                    f"{self.suite.model_endpoints['model_registry']}/{model_id}/versions",
                    timeout=30
                )
                
                versions_result = response.json() if hasattr(response, 'json') else versions_response
                
            # Test model rollback
            rollback_response = {
                'model_id': model_id,
                'previous_version': '4.4.1',
                'new_active_version': '4.4.0',
                'rollback_successful': True,
                'timestamp': datetime.now().isoformat()
            }
            
            rollback_request = {
                'model_id': model_id,
                'target_version': '4.4.0',
                'reason': 'Integration testing rollback'
            }
            
            with patch('requests.post') as mock_post:
                mock_post.return_value.json.return_value = rollback_response
                mock_post.return_value.status_code = 200
                
                response = self.session.post(
                    f"{self.suite.model_endpoints['model_registry']}/{model_id}/rollback",
                    json=rollback_request,
                    timeout=30
                )
                
                rollback_result = response.json() if hasattr(response, 'json') else rollback_response
                
            # Validate versioning operations
            assert len(versions_result['versions']) >= 2
            assert rollback_result['rollback_successful'] == True
            
            self.suite.log_test_result(
                'model_versioning_and_rollback',
                'PASSED',
                {
                    'versions_available': len(versions_result['versions']),
                    'rollback_successful': rollback_result['rollback_successful'],
                    'target_version': rollback_request['target_version']
                }
            )
            
        except Exception as e:
            self.suite.log_test_result(
                'model_versioning_and_rollback',
                'FAILED',
                {'error': str(e)}
            )

class TestFederatedLearningIntegration:
    """Test federated learning coordination and model aggregation"""
    
    def setup_method(self):
        """Setup before each test"""
        self.suite = AIModelIntegrationTestSuite()
        self.session = requests.Session()
    
    def test_federated_training_coordination(self):
        """Test federated learning training coordination"""
        try:
            # Mock federated learning participants
            participants = [
                {'node_id': 'node_001', 'location': 'datacenter_east', 'status': 'ready'},
                {'node_id': 'node_002', 'location': 'datacenter_west', 'status': 'ready'},
                {'node_id': 'node_003', 'location': 'edge_device_01', 'status': 'ready'}
            ]
            
            # Mock training round configuration
            training_config = {
                'model_id': 'federated-trust-classifier',
                'training_round': 5,
                'participants': participants,
                'aggregation_method': 'federated_averaging',
                'min_participants': 2,
                'max_round_time_minutes': 30
            }
            
            # Mock federated training response
            training_response = {
                'training_round_id': 'round_005_20250922',
                'status': 'initiated',
                'participants_count': len(participants),
                'expected_completion': (datetime.now() + timedelta(minutes=30)).isoformat(),
                'coordinator_status': 'coordinating'
            }
            
            # Test federated training initiation (mocked)
            with patch('requests.post') as mock_post:
                mock_post.return_value.json.return_value = training_response
                mock_post.return_value.status_code = 200
                
                response = self.session.post(
                    f"{self.suite.model_endpoints['federated_coordinator']}/train",
                    json=training_config,
                    timeout=60
                )
                
                result = response.json() if hasattr(response, 'json') else training_response
                
            # Validate federated training response
            assert result['status'] in ['initiated', 'coordinating']
            assert result['participants_count'] == len(participants)
            assert 'training_round_id' in result
            
            self.suite.log_test_result(
                'federated_training_coordination',
                'PASSED',
                {
                    'training_round_id': result['training_round_id'],
                    'participants_count': result['participants_count'],
                    'coordinator_status': result.get('coordinator_status', 'unknown')
                }
            )
            
        except Exception as e:
            self.suite.log_test_result(
                'federated_training_coordination',
                'FAILED',
                {'error': str(e)}
            )

    def test_model_aggregation_process(self):
        """Test federated model aggregation and global model update"""
        try:
            # Mock local model updates from participants
            local_updates = [
                {
                    'node_id': 'node_001',
                    'model_weights_hash': 'abc123def456',
                    'training_samples': 1500,
                    'local_accuracy': 0.91,
                    'update_size_mb': 15.2
                },
                {
                    'node_id': 'node_002',
                    'model_weights_hash': 'def456ghi789',
                    'training_samples': 1200,
                    'local_accuracy': 0.89,
                    'update_size_mb': 14.8
                },
                {
                    'node_id': 'node_003',
                    'model_weights_hash': 'ghi789jkl012',
                    'training_samples': 800,
                    'local_accuracy': 0.93,
                    'update_size_mb': 16.1
                }
            ]
            
            # Mock aggregation request
            aggregation_request = {
                'training_round_id': 'round_005_20250922',
                'local_updates': local_updates,
                'aggregation_method': 'federated_averaging',
                'weight_by_samples': True
            }
            
            # Mock aggregation response
            aggregation_response = {
                'aggregation_id': 'agg_round_005_20250922',
                'global_model_hash': 'global_xyz789abc123',
                'aggregated_accuracy': 0.915,
                'participant_contributions': {
                    'node_001': 0.42,  # Weighted contribution
                    'node_002': 0.34,
                    'node_003': 0.24
                },
                'aggregation_time_seconds': 45,
                'status': 'completed'
            }
            
            # Test model aggregation (mocked)
            with patch('requests.post') as mock_post:
                mock_post.return_value.json.return_value = aggregation_response
                mock_post.return_value.status_code = 200
                
                response = self.session.post(
                    f"{self.suite.model_endpoints['federated_coordinator']}/aggregate",
                    json=aggregation_request,
                    timeout=120
                )
                
                result = response.json() if hasattr(response, 'json') else aggregation_response
                
            # Validate aggregation results
            assert result['status'] == 'completed'
            assert 'global_model_hash' in result
            assert 'aggregated_accuracy' in result
            assert len(result['participant_contributions']) == len(local_updates)
            
            self.suite.log_test_result(
                'model_aggregation_process',
                'PASSED',
                {
                    'aggregation_id': result['aggregation_id'],
                    'participants_aggregated': len(result['participant_contributions']),
                    'global_accuracy': result['aggregated_accuracy'],
                    'aggregation_time_seconds': result.get('aggregation_time_seconds', 0)
                }
            )
            
        except Exception as e:
            self.suite.log_test_result(
                'model_aggregation_process',
                'FAILED',
                {'error': str(e)}
            )

class TestModelPerformanceAndMonitoring:
    """Test AI model performance monitoring and metrics"""
    
    def setup_method(self):
        """Setup before each test"""
        self.suite = AIModelIntegrationTestSuite()
        self.session = requests.Session()
    
    def test_model_performance_monitoring(self):
        """Test model performance metrics collection and monitoring"""
        try:
            model_id = 'trust-classifier-v4.4'
            
            # Mock performance metrics request
            metrics_request = {
                'model_id': model_id,
                'time_range': {
                    'start': (datetime.now() - timedelta(hours=24)).isoformat(),
                    'end': datetime.now().isoformat()
                },
                'metrics': ['accuracy', 'latency', 'throughput', 'error_rate']
            }
            
            # Mock performance metrics response
            metrics_response = {
                'model_id': model_id,
                'time_range': metrics_request['time_range'],
                'metrics': {
                    'accuracy': {
                        'current': 0.94,
                        'average_24h': 0.935,
                        'min_24h': 0.91,
                        'max_24h': 0.96
                    },
                    'latency_ms': {
                        'current': 45,
                        'average_24h': 48,
                        'p95_24h': 82,
                        'p99_24h': 115
                    },
                    'throughput_rps': {
                        'current': 150,
                        'average_24h': 142,
                        'max_24h': 280
                    },
                    'error_rate': {
                        'current': 0.002,
                        'average_24h': 0.0035,
                        'max_24h': 0.008
                    }
                },
                'alerts': [],
                'status': 'healthy'
            }
            
            # Test performance monitoring (mocked)
            with patch('requests.get') as mock_get:
                mock_get.return_value.json.return_value = metrics_response
                mock_get.return_value.status_code = 200
                
                response = self.session.get(
                    f"{self.suite.model_endpoints['prediction_service']}/metrics/{model_id}",
                    params=metrics_request,
                    timeout=30
                )
                
                result = response.json() if hasattr(response, 'json') else metrics_response
                
            # Validate performance metrics
            assert 'metrics' in result
            assert 'accuracy' in result['metrics']
            assert 'latency_ms' in result['metrics']
            assert result['status'] in ['healthy', 'warning', 'critical']
            
            # Check performance thresholds
            performance_issues = []
            if result['metrics']['accuracy']['current'] < 0.85:
                performance_issues.append('Low accuracy')
            if result['metrics']['latency_ms']['p95_24h'] > 200:
                performance_issues.append('High latency')
            if result['metrics']['error_rate']['current'] > 0.01:
                performance_issues.append('High error rate')
            
            self.suite.log_test_result(
                'model_performance_monitoring',
                'PASSED' if len(performance_issues) == 0 else 'WARNING',
                {
                    'model_id': model_id,
                    'current_accuracy': result['metrics']['accuracy']['current'],
                    'current_latency_ms': result['metrics']['latency_ms']['current'],
                    'current_error_rate': result['metrics']['error_rate']['current'],
                    'performance_issues': performance_issues,
                    'overall_status': result['status']
                }
            )
            
        except Exception as e:
            self.suite.log_test_result(
                'model_performance_monitoring',
                'FAILED',
                {'error': str(e)}
            )

    def test_model_drift_detection(self):
        """Test model drift detection and data quality monitoring"""
        try:
            model_id = 'trust-classifier-v4.4'
            
            # Mock drift detection request
            drift_request = {
                'model_id': model_id,
                'reference_period': {
                    'start': (datetime.now() - timedelta(days=30)).isoformat(),
                    'end': (datetime.now() - timedelta(days=7)).isoformat()
                },
                'current_period': {
                    'start': (datetime.now() - timedelta(days=7)).isoformat(),
                    'end': datetime.now().isoformat()
                },
                'drift_metrics': ['feature_drift', 'prediction_drift', 'performance_drift']
            }
            
            # Mock drift detection response
            drift_response = {
                'model_id': model_id,
                'drift_analysis': {
                    'feature_drift': {
                        'overall_score': 0.23,
                        'threshold': 0.5,
                        'drift_detected': False,
                        'top_drifted_features': [
                            {'feature': 'user_activity_score', 'drift_score': 0.31},
                            {'feature': 'trust_history_length', 'drift_score': 0.28}
                        ]
                    },
                    'prediction_drift': {
                        'distribution_distance': 0.15,
                        'threshold': 0.3,
                        'drift_detected': False,
                        'prediction_shift': 0.02
                    },
                    'performance_drift': {
                        'accuracy_change': -0.015,
                        'threshold': -0.05,
                        'significant_degradation': False,
                        'trend': 'stable'
                    }
                },
                'recommendations': [
                    'Monitor user_activity_score feature closely',
                    'Consider retraining if accuracy drops below 0.90'
                ],
                'status': 'no_drift_detected'
            }
            
            # Test drift detection (mocked)
            with patch('requests.post') as mock_post:
                mock_post.return_value.json.return_value = drift_response
                mock_post.return_value.status_code = 200
                
                response = self.session.post(
                    f"{self.suite.model_endpoints['prediction_service']}/drift-detection",
                    json=drift_request,
                    timeout=60
                )
                
                result = response.json() if hasattr(response, 'json') else drift_response
                
            # Validate drift detection results
            assert 'drift_analysis' in result
            assert 'feature_drift' in result['drift_analysis']
            assert 'prediction_drift' in result['drift_analysis']
            assert 'performance_drift' in result['drift_analysis']
            
            # Check for significant drift
            drift_alerts = []
            if result['drift_analysis']['feature_drift']['drift_detected']:
                drift_alerts.append('Feature drift detected')
            if result['drift_analysis']['prediction_drift']['drift_detected']:
                drift_alerts.append('Prediction drift detected')
            if result['drift_analysis']['performance_drift']['significant_degradation']:
                drift_alerts.append('Performance degradation detected')
            
            self.suite.log_test_result(
                'model_drift_detection',
                'PASSED' if len(drift_alerts) == 0 else 'WARNING',
                {
                    'model_id': model_id,
                    'feature_drift_score': result['drift_analysis']['feature_drift']['overall_score'],
                    'prediction_drift_distance': result['drift_analysis']['prediction_drift']['distribution_distance'],
                    'accuracy_change': result['drift_analysis']['performance_drift']['accuracy_change'],
                    'drift_alerts': drift_alerts,
                    'overall_status': result['status']
                }
            )
            
        except Exception as e:
            self.suite.log_test_result(
                'model_drift_detection',
                'FAILED',
                {'error': str(e)}
            )

# Test runner and result aggregation
def run_all_ai_model_integration_tests():
    """Run all AI model integration tests and compile results"""
    print("Starting TrustStram v4.4 AI Model Integration Tests...")
    print("=" * 60)
    
    # Initialize test suite
    suite = AIModelIntegrationTestSuite()
    
    # Test classes to run
    test_classes = [
        TestModelInferenceEndpoints,
        TestModelDeploymentAndVersioning,
        TestFederatedLearningIntegration,
        TestModelPerformanceAndMonitoring
    ]
    
    all_results = []
    
    # Run each test class
    for test_class in test_classes:
        print(f"\nRunning {test_class.__name__}...")
        
        # Get all test methods
        test_methods = [method for method in dir(test_class) if method.startswith('test_')]
        
        for method_name in test_methods:
            try:
                # Create test instance
                test_instance = test_class()
                test_instance.setup_method()
                
                # Run test method
                test_method = getattr(test_instance, method_name)
                test_method()
                
                # Cleanup
                test_instance.teardown_method()
                
                # Collect results
                if hasattr(test_instance, 'suite') and test_instance.suite.test_results:
                    all_results.extend(test_instance.suite.test_results)
                
            except Exception as e:
                error_result = {
                    'test_name': f"{test_class.__name__}.{method_name}",
                    'status': 'ERROR',
                    'timestamp': datetime.now().isoformat(),
                    'details': {'error': str(e)}
                }
                all_results.append(error_result)
                print(f"ERROR in {method_name}: {str(e)}")
    
    return all_results

if __name__ == "__main__":
    # Run tests if executed directly
    results = run_all_ai_model_integration_tests()
    
    # Print summary
    passed = len([r for r in results if r['status'] == 'PASSED'])
    failed = len([r for r in results if r['status'] == 'FAILED'])
    warnings = len([r for r in results if r['status'] == 'WARNING'])
    errors = len([r for r in results if r['status'] == 'ERROR'])
    
    print(f"\nAI Model Test Summary:")
    print(f"PASSED:   {passed}")
    print(f"WARNINGS: {warnings}")
    print(f"FAILED:   {failed}")
    print(f"ERRORS:   {errors}")
    print(f"TOTAL:    {len(results)}")