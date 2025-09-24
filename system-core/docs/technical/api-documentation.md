# TrustStram v4.4 Complete API Documentation

**Version**: 4.4.0-production-final  
**Base URL**: `https://your-domain.com/api/v4/`  
**Authentication**: Bearer Token / API Key / OAuth 2.0  
**Documentation Updated**: September 22, 2025

---

## 🔐 Authentication

### Bearer Token Authentication
```bash
Authorization: Bearer your-api-token
```

### API Key Authentication
```bash
X-API-Key: your-api-key
```

### OAuth 2.0 Authentication
```bash
Authorization: Bearer oauth-access-token
```

---

## 🤖 Federated Learning API

### Create Federated Learning Session

**Endpoint**: `POST /federated-learning/sessions`

**Description**: Initialize a new federated learning training session.

**Request Body**:
```json
{
  "model_type": "neural_network",
  "algorithm": "federated_averaging",
  "privacy_budget": 1.0,
  "min_clients": 10,
  "max_clients": 1000,
  "rounds": 100,
  "client_fraction": 0.1,
  "learning_rate": 0.01,
  "batch_size": 32,
  "local_epochs": 5,
  "differential_privacy": {
    "enabled": true,
    "noise_multiplier": 1.1,
    "l2_norm_clip": 1.0
  },
  "secure_aggregation": true,
  "byzantine_robust": true
}
```

**Response**:
```json
{
  "success": true,
  "session_id": "fl-session-uuid-12345",
  "status": "initializing",
  "aggregation_server": "https://fl-agg-1.truststream.ai:8000",
  "coordinator_endpoint": "wss://fl-coord.truststream.ai:8001",
  "client_registration_token": "reg-token-abc123",
  "encryption_key": "encrypted-key-def456",
  "created_at": "2025-09-22T02:00:03Z",
  "estimated_duration": "2-4 hours"
}
```

### Join Federated Learning Session

**Endpoint**: `POST /federated-learning/sessions/{session_id}/join`

**Description**: Register a client to participate in federated learning.

**Request Body**:
```json
{
  "client_id": "client-uuid-67890",
  "registration_token": "reg-token-abc123",
  "data_size": 10000,
  "computation_capability": "high",
  "network_bandwidth": "1gbps",
  "privacy_preferences": {
    "max_privacy_budget": 0.5,
    "data_minimization": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "client_registered": true,
  "client_id": "client-uuid-67890",
  "assigned_round": 1,
  "model_weights_url": "https://fl-storage.truststream.ai/models/init-weights.bin",
  "update_endpoint": "https://fl-agg-1.truststream.ai:8000/update",
  "heartbeat_interval": 30,
  "timeout_seconds": 600
}
```

### Get Federated Learning Session Status

**Endpoint**: `GET /federated-learning/sessions/{session_id}`

**Response**:
```json
{
  "success": true,
  "session_id": "fl-session-uuid-12345",
  "status": "training",
  "current_round": 45,
  "total_rounds": 100,
  "active_clients": 87,
  "total_clients": 156,
  "accuracy": 0.892,
  "loss": 0.234,
  "privacy_budget_used": 0.45,
  "estimated_completion": "2025-09-22T04:30:00Z",
  "performance_metrics": {
    "throughput": "1200 updates/minute",
    "latency_p99": "450ms",
    "byzantine_attacks_detected": 2,
    "differential_privacy_noise": "optimal"
  }
}
```

---

## ☁️ Multi-Cloud Orchestration API

### Deploy Multi-Cloud Workload

**Endpoint**: `POST /multi-cloud/workloads`

**Description**: Deploy a workload across multiple cloud providers with intelligent orchestration.

**Request Body**:
```json
{
  "workload_name": "ai-inference-service",
  "workload_type": "stateless_service",
  "resource_requirements": {
    "cpu": "4 cores",
    "memory": "8GB",
    "gpu": "1x NVIDIA V100",
    "storage": "100GB SSD"
  },
  "deployment_strategy": {
    "type": "multi_region",
    "primary_cloud": "aws",
    "secondary_clouds": ["azure", "gcp"],
    "failover_enabled": true,
    "cost_optimization": true,
    "compliance_requirements": ["gdpr", "hipaa"]
  },
  "scaling_policy": {
    "min_instances": 2,
    "max_instances": 100,
    "target_cpu_utilization": 70,
    "scale_out_cooldown": 300,
    "scale_in_cooldown": 600
  },
  "networking": {
    "service_mesh": "istio",
    "encryption_in_transit": true,
    "load_balancing": "round_robin"
  }
}
```

**Response**:
```json
{
  "success": true,
  "workload_id": "mcw-uuid-abcdef",
  "deployment_status": "deploying",
  "deployments": [
    {
      "cloud_provider": "aws",
      "region": "us-east-1",
      "status": "active",
      "instances": 3,
      "endpoint": "https://ai-inference-aws.truststream.ai",
      "cost_per_hour": 2.45
    },
    {
      "cloud_provider": "azure",
      "region": "eastus",
      "status": "standby",
      "instances": 1,
      "endpoint": "https://ai-inference-azure.truststream.ai",
      "cost_per_hour": 2.20
    }
  ],
  "load_balancer_url": "https://ai-inference.truststream.ai",
  "estimated_monthly_cost": 1780.50,
  "compliance_status": {
    "gdpr": "compliant",
    "hipaa": "compliant"
  }
}
```

### Monitor Multi-Cloud Resources

**Endpoint**: `GET /multi-cloud/workloads/{workload_id}/metrics`

**Response**:
```json
{
  "success": true,
  "workload_id": "mcw-uuid-abcdef",
  "metrics": {
    "overall_health": "healthy",
    "availability": 99.98,
    "response_time_p95": "45ms",
    "throughput": "15000 requests/minute",
    "error_rate": 0.02,
    "cost_efficiency": 0.87
  },
  "cloud_metrics": [
    {
      "cloud_provider": "aws",
      "region": "us-east-1",
      "cpu_utilization": 68.5,
      "memory_utilization": 72.1,
      "network_throughput": "1.2 Gbps",
      "latency": "12ms",
      "cost_last_hour": 2.45
    }
  ],
  "optimization_recommendations": [
    "Consider scaling down Azure instances during low traffic periods",
    "Enable spot instances for non-critical workloads to reduce costs by 60%"
  ]
}
```

---

## 🔍 AI Explainability API

### Generate Model Explanation

**Endpoint**: `POST /ai-explainability/explain`

**Description**: Generate comprehensive explanations for AI model predictions.

**Request Body**:
```json
{
  "model_id": "model-uuid-123",
  "input_data": {
    "feature_1": 0.75,
    "feature_2": "category_a",
    "feature_3": [1, 2, 3, 4, 5]
  },
  "explanation_types": [
    "shap_values",
    "lime_explanation",
    "counterfactual",
    "feature_importance"
  ],
  "stakeholder_type": "business_user",
  "compliance_requirements": ["gdpr_article_22", "eu_ai_act"],
  "output_format": "detailed"
}
```

**Response**:
```json
{
  "success": true,
  "explanation_id": "exp-uuid-789",
  "model_prediction": {
    "predicted_class": "approved",
    "confidence": 0.87,
    "prediction_value": 0.872
  },
  "explanations": {
    "shap_values": {
      "feature_1": 0.23,
      "feature_2": 0.15,
      "feature_3": 0.49,
      "base_value": 0.2
    },
    "lime_explanation": {
      "local_importance": {
        "feature_1": 0.31,
        "feature_2": 0.18,
        "feature_3": 0.51
      },
      "confidence_interval": [0.82, 0.92]
    },
    "counterfactual": {
      "minimal_changes": {
        "feature_1": "increase by 0.05",
        "feature_3": "modify element 2 to 3"
      },
      "resulting_prediction": "declined"
    },
    "feature_importance": [
      {"feature": "feature_3", "importance": 0.51},
      {"feature": "feature_1", "importance": 0.31},
      {"feature": "feature_2", "importance": 0.18}
    ]
  },
  "bias_analysis": {
    "fairness_metrics": {
      "demographic_parity": 0.92,
      "equalized_odds": 0.89,
      "calibration": 0.94
    },
    "bias_detected": false,
    "protected_attributes_impact": "minimal"
  },
  "compliance_report": {
    "gdpr_article_22": {
      "compliant": true,
      "human_interpretable": true,
      "contestable": true
    },
    "eu_ai_act": {
      "risk_level": "limited",
      "transparency_requirements": "met",
      "documentation": "complete"
    }
  },
  "audit_trail": {
    "explanation_timestamp": "2025-09-22T02:00:03Z",
    "model_version": "v2.1.3",
    "explainer_version": "v1.5.0",
    "audit_id": "audit-uuid-456"
  }
}
```

### Create Explanation Dashboard

**Endpoint**: `POST /ai-explainability/dashboards`

**Request Body**:
```json
{
  "dashboard_name": "Credit Decision Explanations",
  "model_ids": ["model-uuid-123", "model-uuid-456"],
  "stakeholder_groups": ["business_users", "compliance_officers"],
  "visualization_types": [
    "feature_importance_plot",
    "decision_boundary",
    "bias_monitoring",
    "model_performance"
  ],
  "refresh_interval": "1 hour",
  "access_controls": {
    "public": false,
    "authorized_users": ["user-1", "user-2"],
    "audit_logging": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "dashboard_id": "dash-uuid-789",
  "dashboard_url": "https://explainability.truststream.ai/dash/dash-uuid-789",
  "embed_code": "<iframe src='...' width='100%' height='600'></iframe>",
  "api_endpoints": {
    "real_time_data": "/api/v4/ai-explainability/dashboards/dash-uuid-789/data",
    "export_data": "/api/v4/ai-explainability/dashboards/dash-uuid-789/export"
  },
  "status": "active"
}
```

---

## 🔐 Quantum Encryption API

### Generate Quantum-Safe Keys

**Endpoint**: `POST /quantum-encryption/keys/generate`

**Description**: Generate post-quantum cryptographic keys using NIST-approved algorithms.

**Request Body**:
```json
{
  "algorithm": "kyber_1024",
  "key_usage": "encryption",
  "key_validity": "1 year",
  "hsm_backed": true,
  "backup_enabled": true,
  "metadata": {
    "application": "federated_learning",
    "environment": "production",
    "compliance_level": "fips_140_2_level_3"
  }
}
```

**Response**:
```json
{
  "success": true,
  "key_id": "qkey-uuid-abc123",
  "algorithm": "kyber_1024",
  "public_key": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
  "key_fingerprint": "SHA256:abc123def456...",
  "hsm_key_id": "hsm-key-789",
  "creation_timestamp": "2025-09-22T02:00:03Z",
  "expiration_timestamp": "2026-09-22T02:00:03Z",
  "quantum_security_level": 256,
  "classical_security_level": 3072,
  "status": "active"
}
```

### Encrypt Data with Quantum-Safe Algorithm

**Endpoint**: `POST /quantum-encryption/encrypt`

**Request Body**:
```json
{
  "data": "sensitive information to encrypt",
  "key_id": "qkey-uuid-abc123",
  "algorithm": "kyber_1024",
  "additional_data": "metadata for authenticated encryption",
  "compression": true
}
```

**Response**:
```json
{
  "success": true,
  "encrypted_data": "base64-encoded-encrypted-data",
  "encryption_metadata": {
    "algorithm": "kyber_1024",
    "key_id": "qkey-uuid-abc123",
    "nonce": "random-nonce-123",
    "compression_ratio": 0.67,
    "encryption_timestamp": "2025-09-22T02:00:03Z"
  },
  "integrity_hash": "sha3-256-hash",
  "quantum_proof": true
}
```

### Perform Quantum Key Exchange

**Endpoint**: `POST /quantum-encryption/key-exchange`

**Description**: Establish quantum-safe shared secrets between parties.

**Request Body**:
```json
{
  "initiator_id": "party-a-uuid",
  "responder_id": "party-b-uuid",
  "protocol": "kem_encapsulation",
  "public_key": "-----BEGIN PUBLIC KEY-----\n...",
  "session_parameters": {
    "forward_secrecy": true,
    "perfect_forward_secrecy": true,
    "session_timeout": 3600
  }
}
```

**Response**:
```json
{
  "success": true,
  "session_id": "qke-session-uuid",
  "shared_secret": "quantum-safe-shared-secret",
  "encapsulated_key": "base64-encoded-key",
  "session_established": true,
  "security_parameters": {
    "quantum_security_level": 256,
    "classical_security_level": 3072,
    "forward_secrecy": true,
    "authentication": "mutual"
  },
  "session_expires_at": "2025-09-22T03:00:03Z"
}
```

---

## 🔗 Enterprise Integration API

### Create Workflow Automation

**Endpoint**: `POST /enterprise-integration/workflows`

**Description**: Create automated workflows connecting enterprise systems.

**Request Body**:
```json
{
  "workflow_name": "Customer Onboarding Automation",
  "trigger": {
    "type": "webhook",
    "source_system": "salesforce",
    "event": "lead_qualified"
  },
  "steps": [
    {
      "step_id": "validate_data",
      "action": "data_validation",
      "service": "truststream_ai",
      "parameters": {
        "validation_rules": ["email_format", "phone_format", "address_complete"]
      }
    },
    {
      "step_id": "create_account",
      "action": "account_creation",
      "service": "sap_system",
      "parameters": {
        "account_type": "prospect",
        "approval_required": false
      },
      "conditions": {
        "if": "validate_data.success == true"
      }
    },
    {
      "step_id": "send_welcome",
      "action": "email_notification",
      "service": "microsoft_365",
      "parameters": {
        "template": "welcome_template",
        "personalization": true
      }
    }
  ],
  "error_handling": {
    "retry_policy": "exponential_backoff",
    "max_retries": 3,
    "fallback_action": "human_intervention"
  },
  "monitoring": {
    "sla_targets": {
      "completion_time": "< 5 minutes",
      "success_rate": "> 95%"
    },
    "alerts": ["sla_breach", "failure_rate_high"]
  }
}
```

**Response**:
```json
{
  "success": true,
  "workflow_id": "wf-uuid-12345",
  "workflow_name": "Customer Onboarding Automation",
  "status": "active",
  "webhook_url": "https://integration.truststream.ai/webhooks/wf-uuid-12345",
  "api_endpoints": {
    "status": "/api/v4/enterprise-integration/workflows/wf-uuid-12345/status",
    "metrics": "/api/v4/enterprise-integration/workflows/wf-uuid-12345/metrics",
    "logs": "/api/v4/enterprise-integration/workflows/wf-uuid-12345/logs"
  },
  "estimated_execution_time": "2-3 minutes",
  "cost_per_execution": 0.05
}
```

### Real-time Event Processing

**Endpoint**: `POST /enterprise-integration/events`

**Description**: Process real-time events from enterprise systems with intelligent routing.

**Request Body**:
```json
{
  "event_type": "customer_interaction",
  "source_system": "crm_system",
  "event_data": {
    "customer_id": "cust-123456",
    "interaction_type": "support_ticket",
    "priority": "high",
    "category": "billing_issue",
    "description": "Customer unable to access premium features",
    "timestamp": "2025-09-22T02:00:03Z"
  },
  "routing_preferences": {
    "intelligent_routing": true,
    "priority_escalation": true,
    "ml_classification": true
  },
  "required_actions": [
    "classify_severity",
    "route_to_specialist",
    "update_customer_profile"
  ]
}
```

**Response**:
```json
{
  "success": true,
  "event_id": "evt-uuid-789",
  "processing_status": "completed",
  "classification_results": {
    "severity": "high",
    "category_confidence": 0.94,
    "estimated_resolution_time": "2 hours",
    "similar_cases": 15
  },
  "routing_decision": {
    "assigned_agent": "agent-billing-specialist-1",
    "department": "billing_support",
    "escalation_path": ["team_lead", "department_manager"],
    "auto_escalation_time": "30 minutes"
  },
  "actions_taken": [
    {
      "action": "classify_severity",
      "result": "high_priority",
      "confidence": 0.94,
      "processing_time": "150ms"
    },
    {
      "action": "route_to_specialist",
      "result": "assigned_to_agent-billing-specialist-1",
      "processing_time": "50ms"
    },
    {
      "action": "update_customer_profile",
      "result": "interaction_logged",
      "processing_time": "200ms"
    }
  ],
  "total_processing_time": "400ms"
}
```

---

## 📊 Performance & Monitoring APIs

### Get System Performance Metrics

**Endpoint**: `GET /monitoring/performance`

**Query Parameters**:
- `time_range`: `1h`, `24h`, `7d`, `30d`
- `metrics`: `cpu`, `memory`, `network`, `storage`, `requests`
- `aggregation`: `avg`, `min`, `max`, `p95`, `p99`

**Response**:
```json
{
  "success": true,
  "time_range": "1h",
  "metrics": {
    "system_performance": {
      "cpu_utilization": {
        "average": 45.2,
        "peak": 78.5,
        "trend": "stable"
      },
      "memory_utilization": {
        "average": 62.1,
        "peak": 89.3,
        "trend": "increasing"
      },
      "network_throughput": {
        "ingress_mbps": 850.4,
        "egress_mbps": 432.1,
        "packet_loss": 0.01
      }
    },
    "application_performance": {
      "response_time": {
        "p50": "23ms",
        "p95": "45ms",
        "p99": "89ms"
      },
      "throughput": {
        "requests_per_second": 12500,
        "peak_rps": 18900
      },
      "error_rate": 0.02,
      "availability": 99.98
    },
    "federated_learning": {
      "active_sessions": 45,
      "client_participation_rate": 0.87,
      "training_efficiency": 0.92,
      "convergence_rate": "15% faster than baseline"
    },
    "ai_explainability": {
      "explanations_generated": 1250,
      "average_explanation_time": "340ms",
      "compliance_check_success_rate": 0.995
    },
    "quantum_encryption": {
      "encryption_operations": 5600,
      "key_generation_time": "120ms",
      "quantum_security_level": 256
    }
  },
  "alerts": [
    {
      "level": "warning",
      "message": "Memory utilization trending upward",
      "recommendation": "Consider scaling resources"
    }
  ],
  "optimization_suggestions": [
    "Enable automatic scaling for federated learning sessions",
    "Implement caching for frequently requested explanations"
  ]
}
```

---

## 🚒 Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": {
      "field": "privacy_budget",
      "issue": "Value must be between 0.1 and 10.0",
      "provided_value": 15.0
    },
    "request_id": "req-uuid-12345",
    "timestamp": "2025-09-22T02:00:03Z",
    "documentation_url": "https://docs.truststream.ai/v44/errors/validation-error"
  }
}
```

### Error Codes
- `AUTHENTICATION_ERROR` (401): Invalid or missing authentication
- `AUTHORIZATION_ERROR` (403): Insufficient permissions
- `VALIDATION_ERROR` (400): Invalid request parameters
- `NOT_FOUND` (404): Resource not found
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error
- `SERVICE_UNAVAILABLE` (503): Service temporarily unavailable

---

## 💬 SDKs and Client Libraries

### JavaScript SDK
```javascript
const TrustStram = require('@truststream/sdk');

const client = new TrustStram({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.truststream.ai/v4'
});

// Federated Learning
const flSession = await client.federatedLearning.createSession({
  modelType: 'neural_network',
  minClients: 10,
  privacyBudget: 1.0
});

// AI Explainability
const explanation = await client.aiExplainability.explain({
  modelId: 'model-123',
  inputData: { feature1: 0.5, feature2: 'A' },
  explanationTypes: ['shap_values', 'lime_explanation']
});
```

### Python SDK
```python
from truststream import TrustStramClient

client = TrustStramClient(
    api_key='your-api-key',
    base_url='https://api.truststream.ai/v4'
)

# Multi-Cloud Orchestration
workload = client.multi_cloud.deploy_workload(
    workload_name='ai-service',
    resource_requirements={'cpu': '4 cores', 'memory': '8GB'},
    deployment_strategy={'type': 'multi_region', 'primary_cloud': 'aws'}
)

# Quantum Encryption
keys = client.quantum_encryption.generate_keys(
    algorithm='kyber_1024',
    key_usage='encryption'
)
```

---

## 🔄 API Versioning

- **Current Version**: v4.4
- **Supported Versions**: v4.3, v4.4
- **Deprecation Notice**: v4.2 and earlier versions will be deprecated on March 22, 2026
- **Version Header**: Include `API-Version: 4.4` header for explicit versioning

---

## 📦 Rate Limiting

- **Standard Tier**: 1,000 requests/hour
- **Professional Tier**: 10,000 requests/hour
- **Enterprise Tier**: 100,000 requests/hour
- **Rate Limit Headers**: 
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

---

**API Documentation Version**: 1.0.0  
**Last Updated**: September 22, 2025  
**Next Review**: December 22, 2025