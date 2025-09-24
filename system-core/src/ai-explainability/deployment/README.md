# TrustStram v4.4 AI Explainability Deployment Guide

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Python 3.11+
- Redis (for caching)
- PostgreSQL (for audit trails)

### Production Deployment

1. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Start All Services**:
   ```bash
   docker-compose up -d
   ```

3. **Verify Deployment**:
   ```bash
   curl http://localhost:8080/health
   ```

### Service Endpoints

- **Explanation Gateway**: http://localhost:8080
- **Grafana Dashboards**: http://localhost:3000 (admin/admin)
- **MLflow Registry**: http://localhost:5000
- **MinIO Storage**: http://localhost:9001 (minioadmin/minioadmin)

### API Usage Examples

```python
import requests

# Generate explanation
response = requests.post("http://localhost:8080/explain", json={
    "model_id": "my_model",
    "input_data": [1.0, 2.0, 3.0, 4.0, 5.0],
    "explanation_type": "shap",
    "stakeholder_type": "end_user"
})

# Perform bias audit
audit_response = requests.post("http://localhost:8080/audit/bias", json={
    "model_id": "my_model",
    "predictions": [1, 0, 1, 1, 0],
    "ground_truth": [1, 0, 1, 0, 0],
    "scores": [0.9, 0.1, 0.8, 0.7, 0.2],
    "sensitive_attributes": {
        "gender": ["M", "F", "M", "F", "M"],
        "age_group": ["young", "old", "middle", "old", "young"]
    }
})
```

### Performance Monitoring

Access Grafana at http://localhost:3000 for:
- API response times
- Cache hit rates
- Error rates
- Resource utilization

### Security Configuration

1. **Enable HTTPS**:
   - Place SSL certificates in `config/ssl/`
   - Update nginx configuration

2. **JWT Authentication**:
   - Configure JWT secret in environment variables
   - Implement user authentication service

3. **Data Encryption**:
   - Enable encryption at rest for PostgreSQL
   - Configure Redis AUTH

### Scaling Configuration

- **Horizontal Scaling**: Adjust replicas in docker-compose
- **Vertical Scaling**: Modify resource limits
- **Load Balancing**: Configure nginx upstream servers

### Troubleshooting

Check logs:
```bash
docker-compose logs explanation-gateway
docker-compose logs explainer-service
```

Common issues:
- Redis connection failures: Check network connectivity
- High response times: Monitor cache hit rates
- Memory issues: Adjust worker counts and memory limits
