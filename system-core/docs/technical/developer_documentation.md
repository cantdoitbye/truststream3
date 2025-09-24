# TrustStram v4.4 Developer Documentation

## Table of Contents
1. [Getting Started](#getting-started)
2. [SDK Installation](#sdk-installation)
3. [Authentication](#authentication)
4. [Core APIs](#core-apis)
5. [Federated Learning Integration](#federated-learning-integration)
6. [Multi-Cloud Operations](#multi-cloud-operations)
7. [Explainability Features](#explainability-features)
8. [Quantum Encryption](#quantum-encryption)
9. [Code Examples](#code-examples)
10. [Best Practices](#best-practices)
11. [Error Handling](#error-handling)
12. [Performance Optimization](#performance-optimization)

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+ (for JavaScript SDK)
- Java 11+ (for Java SDK)
- Docker (for containerized deployments)

### Development Environment Setup
```bash
# Clone the TrustStram SDK
git clone https://github.com/truststram/sdk-v4.4.git
cd sdk-v4.4

# Install dependencies
pip install -r requirements.txt
npm install  # for JavaScript components
```

## SDK Installation

### Python SDK
```bash
pip install truststram-sdk==4.4.0
```

### JavaScript SDK
```bash
npm install @truststram/sdk@4.4.0
```

### Java SDK
```xml
<dependency>
    <groupId>com.truststram</groupId>
    <artifactId>truststram-sdk</artifactId>
    <version>4.4.0</version>
</dependency>
```

## Authentication

### API Key Authentication
```python
from truststram import TrustStramClient

# Initialize client with API key
client = TrustStramClient(
    api_key="your_api_key_here",
    environment="production"  # or "sandbox"
)
```

### OAuth 2.0 Authentication
```python
from truststram.auth import OAuth2Provider

# OAuth2 setup
auth_provider = OAuth2Provider(
    client_id="your_client_id",
    client_secret="your_client_secret",
    redirect_uri="https://your-app.com/callback"
)

# Get authorization URL
auth_url = auth_provider.get_authorization_url()

# Exchange code for token
token = auth_provider.exchange_code(authorization_code)
client = TrustStramClient(oauth_token=token)
```

### Service Account Authentication
```python
from truststram.auth import ServiceAccount

# Service account authentication
service_account = ServiceAccount.from_file("path/to/service-account.json")
client = TrustStramClient(service_account=service_account)
```

## Core APIs

### Model Management API
```python
# Create a new model
model = client.models.create(
    name="fraud-detection-v2",
    type="classification",
    framework="tensorflow",
    version="2.1.0"
)

# Upload model artifacts
with open("model.pkl", "rb") as f:
    client.models.upload_artifacts(model.id, f)

# Deploy model
deployment = client.models.deploy(
    model_id=model.id,
    environment="production",
    scaling_config={
        "min_instances": 2,
        "max_instances": 10,
        "auto_scaling": True
    }
)
```

### Data Pipeline API
```python
# Create data pipeline
pipeline = client.pipelines.create(
    name="customer-data-pipeline",
    source_config={
        "type": "database",
        "connection_string": "postgresql://user:pass@host:5432/db",
        "table": "customer_data"
    },
    transformation_config={
        "steps": [
            {"type": "clean", "remove_nulls": True},
            {"type": "normalize", "method": "minmax"},
            {"type": "encode", "categorical_columns": ["category", "region"]}
        ]
    }
)

# Execute pipeline
result = client.pipelines.execute(pipeline.id)
```

### Real-time Inference API
```python
# Make predictions
prediction = client.inference.predict(
    model_id="fraud-detection-v2",
    data={
        "transaction_amount": 1500.00,
        "merchant_category": "electronics",
        "user_history": {"avg_transaction": 250.00}
    }
)

print(f"Fraud probability: {prediction.confidence}")
print(f"Decision: {prediction.result}")
```

## Federated Learning Integration

### Setting Up Federated Learning
```python
from truststram.federated import FederatedLearningCoordinator

# Initialize federated learning coordinator
coordinator = FederatedLearningCoordinator(
    strategy="federated_averaging",
    min_clients=3,
    min_fit_clients=2,
    min_eval_clients=2,
    fraction_fit=0.5,
    fraction_eval=0.5
)

# Define federated model
federated_model = coordinator.create_model(
    model_config={
        "architecture": "neural_network",
        "layers": [
            {"type": "dense", "units": 128, "activation": "relu"},
            {"type": "dropout", "rate": 0.2},
            {"type": "dense", "units": 64, "activation": "relu"},
            {"type": "dense", "units": 1, "activation": "sigmoid"}
        ]
    }
)
```

### Client Implementation
```python
from truststram.federated import FederatedClient

class CustomFederatedClient(FederatedClient):
    def __init__(self, client_id, local_data):
        super().__init__(client_id)
        self.local_data = local_data
    
    def get_parameters(self):
        """Return current model parameters."""
        return self.model.get_weights()
    
    def fit(self, parameters, config):
        """Train model with local data."""
        self.model.set_weights(parameters)
        
        # Local training
        history = self.model.fit(
            self.local_data['X_train'],
            self.local_data['y_train'],
            epochs=config['epochs'],
            batch_size=config['batch_size'],
            validation_split=0.2
        )
        
        return self.model.get_weights(), len(self.local_data['X_train']), {}
    
    def evaluate(self, parameters, config):
        """Evaluate model with local data."""
        self.model.set_weights(parameters)
        
        loss, accuracy = self.model.evaluate(
            self.local_data['X_test'],
            self.local_data['y_test']
        )
        
        return loss, len(self.local_data['X_test']), {"accuracy": accuracy}

# Start federated client
client = CustomFederatedClient("client_1", local_data)
client.start("localhost:8080")
```

## Multi-Cloud Operations

### Cloud Provider Configuration
```python
from truststram.cloud import MultiCloudManager

# Configure multiple cloud providers
cloud_manager = MultiCloudManager()

# Add AWS configuration
cloud_manager.add_provider(
    name="aws",
    type="aws",
    config={
        "region": "us-west-2",
        "access_key": "your_access_key",
        "secret_key": "your_secret_key"
    }
)

# Add Azure configuration
cloud_manager.add_provider(
    name="azure",
    type="azure",
    config={
        "subscription_id": "your_subscription_id",
        "tenant_id": "your_tenant_id",
        "client_id": "your_client_id",
        "client_secret": "your_client_secret"
    }
)

# Add GCP configuration
cloud_manager.add_provider(
    name="gcp",
    type="gcp",
    config={
        "project_id": "your_project_id",
        "service_account_path": "path/to/service-account.json"
    }
)
```

### Cross-Cloud Deployment
```python
# Deploy across multiple clouds
deployment = cloud_manager.deploy_multi_cloud(
    model_id="fraud-detection-v2",
    deployment_config={
        "aws": {
            "instance_type": "ml.m5.large",
            "region": "us-west-2",
            "auto_scaling": True
        },
        "azure": {
            "vm_size": "Standard_D2s_v3",
            "region": "westus2",
            "auto_scaling": True
        },
        "gcp": {
            "machine_type": "n1-standard-2",
            "region": "us-central1",
            "auto_scaling": True
        }
    },
    load_balancing={
        "strategy": "geographic",
        "health_checks": True,
        "failover": True
    }
)
```

### Cross-Cloud Data Synchronization
```python
# Set up data synchronization
sync_job = cloud_manager.create_sync_job(
    name="model-data-sync",
    source={
        "provider": "aws",
        "bucket": "truststram-models",
        "path": "/models/fraud-detection/"
    },
    destinations=[
        {
            "provider": "azure",
            "container": "truststram-models",
            "path": "/models/fraud-detection/"
        },
        {
            "provider": "gcp",
            "bucket": "truststram-models",
            "path": "/models/fraud-detection/"
        }
    ],
    schedule="0 */6 * * *",  # Every 6 hours
    encryption=True
)
```

## Explainability Features

### SHAP Integration
```python
from truststram.explainability import SHAPExplainer

# Initialize SHAP explainer
explainer = SHAPExplainer(
    model=model,
    background_data=X_train_sample,
    feature_names=feature_names
)

# Generate explanations
explanations = explainer.explain(X_test[:10])

# Get feature importance
feature_importance = explainer.get_feature_importance()

# Generate plots
explainer.plot_summary(explanations, save_path="shap_summary.png")
explainer.plot_waterfall(explanations[0], save_path="shap_waterfall.png")
```

### LIME Integration
```python
from truststram.explainability import LIMEExplainer

# Initialize LIME explainer
lime_explainer = LIMEExplainer(
    model=model,
    feature_names=feature_names,
    class_names=['Not Fraud', 'Fraud']
)

# Explain individual predictions
explanation = lime_explainer.explain_instance(
    data_row=X_test[0],
    num_features=10
)

# Save explanation
explanation.save_to_file('lime_explanation.html')
```

### Custom Explainability
```python
from truststram.explainability import BaseExplainer

class CustomExplainer(BaseExplainer):
    def __init__(self, model, feature_names):
        super().__init__(model, feature_names)
    
    def explain(self, data, method="gradient"):
        """Custom explanation method."""
        if method == "gradient":
            return self._gradient_explanation(data)
        elif method == "permutation":
            return self._permutation_explanation(data)
        else:
            raise ValueError(f"Unknown method: {method}")
    
    def _gradient_explanation(self, data):
        """Gradient-based explanation."""
        # Implementation here
        pass
    
    def _permutation_explanation(self, data):
        """Permutation-based explanation."""
        # Implementation here
        pass
```

## Quantum Encryption

### Quantum Key Distribution
```python
from truststram.quantum import QuantumEncryption

# Initialize quantum encryption
quantum_crypto = QuantumEncryption(
    protocol="BB84",  # or "SARG04", "E91"
    key_length=256
)

# Generate quantum key pair
alice_key, bob_key = quantum_crypto.generate_key_pair()

# Encrypt data
encrypted_data = quantum_crypto.encrypt(
    data="sensitive model parameters",
    key=alice_key
)

# Decrypt data
decrypted_data = quantum_crypto.decrypt(
    encrypted_data=encrypted_data,
    key=bob_key
)
```

### Post-Quantum Cryptography
```python
from truststram.quantum import PostQuantumCrypto

# Initialize post-quantum encryption
pq_crypto = PostQuantumCrypto(
    algorithm="CRYSTALS-Kyber",  # or "SABER", "NTRU"
    security_level=3
)

# Generate key pair
public_key, private_key = pq_crypto.generate_keypair()

# Encrypt model
encrypted_model = pq_crypto.encrypt_model(
    model_path="path/to/model.pkl",
    public_key=public_key
)

# Decrypt model
decrypted_model = pq_crypto.decrypt_model(
    encrypted_model=encrypted_model,
    private_key=private_key
)
```

## Code Examples

### Complete ML Pipeline Example
```python
import pandas as pd
from truststram import TrustStramClient
from truststram.preprocessing import DataProcessor
from truststram.models import MLModel
from truststram.explainability import SHAPExplainer

def create_ml_pipeline():
    # Initialize client
    client = TrustStramClient(api_key="your_api_key")
    
    # Load and preprocess data
    data = pd.read_csv("customer_data.csv")
    processor = DataProcessor()
    
    X_processed, y_processed = processor.fit_transform(
        data.drop('target', axis=1),
        data['target']
    )
    
    # Create and train model
    model = MLModel(
        algorithm="gradient_boosting",
        hyperparameters={
            "n_estimators": 100,
            "learning_rate": 0.1,
            "max_depth": 6
        }
    )
    
    model.fit(X_processed, y_processed)
    
    # Add explainability
    explainer = SHAPExplainer(
        model=model,
        background_data=X_processed[:100]
    )
    
    # Deploy model
    deployment = client.models.deploy(
        model=model,
        explainer=explainer,
        environment="production"
    )
    
    return deployment

# Execute pipeline
deployment = create_ml_pipeline()
print(f"Model deployed: {deployment.endpoint_url}")
```

### Federated Learning Example
```python
import threading
from truststram.federated import FederatedServer, FederatedClient

def run_federated_learning():
    # Start federated server
    server = FederatedServer(
        strategy="federated_averaging",
        min_clients=3,
        rounds=10
    )
    
    server_thread = threading.Thread(target=server.start)
    server_thread.start()
    
    # Simulate multiple clients
    clients = []
    for i in range(3):
        client = FederatedClient(
            client_id=f"client_{i}",
            data_path=f"data/client_{i}_data.csv"
        )
        client_thread = threading.Thread(target=client.start)
        client_thread.start()
        clients.append(client_thread)
    
    # Wait for completion
    server_thread.join()
    for client_thread in clients:
        client_thread.join()

# Run federated learning
run_federated_learning()
```

### Real-time Inference Example
```python
from flask import Flask, request, jsonify
from truststram import TrustStramClient

app = Flask(__name__)
client = TrustStramClient(api_key="your_api_key")

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Get input data
        data = request.json
        
        # Make prediction
        prediction = client.inference.predict(
            model_id="fraud-detection-v2",
            data=data
        )
        
        # Return result
        return jsonify({
            "prediction": prediction.result,
            "confidence": prediction.confidence,
            "explanation": prediction.explanation
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

## Best Practices

### 1. Error Handling
```python
from truststram.exceptions import TrustStramException, ModelNotFoundError

try:
    prediction = client.inference.predict(model_id="invalid_model", data=data)
except ModelNotFoundError:
    # Handle model not found
    logging.error("Model not found, using fallback model")
    prediction = client.inference.predict(model_id="fallback_model", data=data)
except TrustStramException as e:
    # Handle other TrustStram exceptions
    logging.error(f"TrustStram error: {e}")
    raise
except Exception as e:
    # Handle unexpected errors
    logging.error(f"Unexpected error: {e}")
    raise
```

### 2. Logging and Monitoring
```python
import logging
from truststram.monitoring import ModelMonitor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set up monitoring
monitor = ModelMonitor(
    model_id="fraud-detection-v2",
    metrics=["accuracy", "precision", "recall", "latency"],
    alerts={
        "accuracy_threshold": 0.85,
        "latency_threshold": 100  # ms
    }
)

# Log predictions
def log_prediction(prediction_request, prediction_result):
    logger.info(f"Prediction made: {prediction_request} -> {prediction_result}")
    monitor.log_prediction(prediction_request, prediction_result)
```

### 3. Resource Management
```python
from contextlib import contextmanager
from truststram import TrustStramClient

@contextmanager
def truststram_session(api_key):
    """Context manager for TrustStram sessions."""
    client = TrustStramClient(api_key=api_key)
    try:
        yield client
    finally:
        client.close()

# Usage
with truststram_session("your_api_key") as client:
    prediction = client.inference.predict(model_id="model", data=data)
```

## Error Handling

### Common Error Types
```python
from truststram.exceptions import (
    TrustStramException,
    AuthenticationError,
    ModelNotFoundError,
    InsufficientResourcesError,
    RateLimitExceededError
)

def handle_truststram_errors(func):
    """Decorator for handling TrustStram errors."""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except AuthenticationError:
            logging.error("Authentication failed - check API key")
            raise
        except ModelNotFoundError as e:
            logging.error(f"Model not found: {e.model_id}")
            raise
        except InsufficientResourcesError:
            logging.error("Insufficient resources - try again later")
            raise
        except RateLimitExceededError as e:
            logging.error(f"Rate limit exceeded - retry after {e.retry_after} seconds")
            raise
        except TrustStramException as e:
            logging.error(f"TrustStram error: {e}")
            raise
    return wrapper
```

### Retry Logic
```python
import time
from functools import wraps

def retry_on_failure(max_retries=3, delay=1, backoff=2):
    """Retry decorator with exponential backoff."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            retries = 0
            while retries < max_retries:
                try:
                    return func(*args, **kwargs)
                except (RateLimitExceededError, InsufficientResourcesError) as e:
                    retries += 1
                    if retries >= max_retries:
                        raise
                    wait_time = delay * (backoff ** (retries - 1))
                    logging.warning(f"Retrying in {wait_time} seconds... (attempt {retries})")
                    time.sleep(wait_time)
            return func(*args, **kwargs)
        return wrapper
    return decorator

# Usage
@retry_on_failure(max_retries=3)
def make_prediction(data):
    return client.inference.predict(model_id="model", data=data)
```

## Performance Optimization

### Batch Processing
```python
# Batch predictions for better performance
def batch_predict(client, model_id, data_list, batch_size=32):
    """Process predictions in batches."""
    results = []
    
    for i in range(0, len(data_list), batch_size):
        batch = data_list[i:i + batch_size]
        
        batch_results = client.inference.batch_predict(
            model_id=model_id,
            data_batch=batch
        )
        
        results.extend(batch_results)
    
    return results
```

### Async Operations
```python
import asyncio
import aiohttp
from truststram.async_client import AsyncTrustStramClient

async def async_predictions(data_list):
    """Make predictions asynchronously."""
    async with AsyncTrustStramClient(api_key="your_api_key") as client:
        tasks = [
            client.inference.predict(model_id="model", data=data)
            for data in data_list
        ]
        
        results = await asyncio.gather(*tasks)
        return results

# Usage
data_list = [{"feature1": 1, "feature2": 2} for _ in range(100)]
results = asyncio.run(async_predictions(data_list))
```

### Caching
```python
from functools import lru_cache
import pickle
import hashlib

class PredictionCache:
    def __init__(self, cache_size=1000):
        self.cache_size = cache_size
        self.cache = {}
    
    def _get_key(self, data):
        """Generate cache key from data."""
        return hashlib.md5(pickle.dumps(data)).hexdigest()
    
    def get(self, data):
        """Get cached prediction."""
        key = self._get_key(data)
        return self.cache.get(key)
    
    def set(self, data, prediction):
        """Cache prediction."""
        if len(self.cache) >= self.cache_size:
            # Remove oldest entry
            oldest_key = next(iter(self.cache))
            del self.cache[oldest_key]
        
        key = self._get_key(data)
        self.cache[key] = prediction

# Usage
cache = PredictionCache()

def cached_predict(data):
    # Check cache first
    cached_result = cache.get(data)
    if cached_result:
        return cached_result
    
    # Make prediction
    result = client.inference.predict(model_id="model", data=data)
    
    # Cache result
    cache.set(data, result)
    return result
```

---

## Support and Resources

- **API Reference**: https://docs.truststram.com/api/v4.4
- **GitHub Repository**: https://github.com/truststram/sdk-v4.4
- **Community Forum**: https://community.truststram.com
- **Support Email**: support@truststram.com

For additional examples and tutorials, visit our [Developer Portal](https://developers.truststram.com).