# TrustStream v4.2 - API Documentation

**Version:** 4.2.0  
**Generated:** 2025-09-20  
**Author:** MiniMax Agent

## 🌐 Base URLs

- **Production:** `https://api.truststream.com`
- **Staging:** `https://staging-api.truststream.com`
- **Development:** `http://localhost:3000`

## 🔐 Authentication

TrustStream uses Supabase Auth with JWT tokens.

### Authentication Header
```http
Authorization: Bearer <jwt_token>
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user"
  }
}
```

## 📊 Core API Endpoints

### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-20T20:28:32Z",
  "version": "4.2.0",
  "database": "connected",
  "services": {
    "auth": "operational",
    "storage": "operational",
    "edge_functions": "operational"
  }
}
```

### Dashboard Data
```http
GET /api/dashboard
Authorization: Bearer <token>
```

**Response:**
```json
{
  "summary": {
    "total_projects": 156,
    "active_users": 1243,
    "governance_score": 8.7,
    "trust_index": 94.2
  },
  "recent_activity": [
    {
      "id": "uuid",
      "type": "governance_update",
      "description": "New governance policy implemented",
      "timestamp": "2025-09-20T20:28:32Z",
      "user_id": "uuid"
    }
  ],
  "metrics": {
    "response_time_ms": 156,
    "uptime_percentage": 99.98,
    "error_rate": 0.02
  }
}
```

## 🏛️ Governance API

### Get Governance Score
```http
GET /api/governance/score?project_id={project_id}
Authorization: Bearer <token>
```

**Parameters:**
- `project_id` (required): Project identifier

**Response:**
```json
{
  "project_id": "uuid",
  "governance_score": 8.7,
  "components": {
    "transparency": 9.2,
    "accountability": 8.1,
    "participation": 8.9,
    "effectiveness": 8.6
  },
  "recommendations": [
    "Increase stakeholder participation in decision-making",
    "Implement regular governance audits"
  ],
  "last_updated": "2025-09-20T20:28:32Z"
}
```

### Update Governance Policy
```http
POST /api/governance/policy
Authorization: Bearer <token>
Content-Type: application/json

{
  "project_id": "uuid",
  "policy_type": "decision_making",
  "title": "Stakeholder Voting Policy",
  "description": "New policy for stakeholder participation",
  "effective_date": "2025-10-01",
  "requirements": [
    "Minimum 60% stakeholder participation",
    "72-hour voting window"
  ]
}
```

### Get Trust Assessment
```http
GET /api/governance/trust-assessment?entity_id={entity_id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "entity_id": "uuid",
  "trust_score": 94.2,
  "trust_factors": {
    "historical_performance": 96.1,
    "transparency_index": 92.8,
    "stakeholder_confidence": 93.7,
    "governance_quality": 94.9
  },
  "risk_indicators": [],
  "trust_trend": "increasing",
  "last_assessment": "2025-09-20T20:28:32Z"
}
```

## 📈 Analytics API

### Get Analytics Summary
```http
GET /api/analytics/summary?period={period}&project_id={project_id}
Authorization: Bearer <token>
```

**Parameters:**
- `period`: `7d`, `30d`, `90d`, `1y`
- `project_id` (optional): Filter by project

**Response:**
```json
{
  "period": "30d",
  "metrics": {
    "user_engagement": {
      "active_users": 1243,
      "session_duration_avg": 28.5,
      "bounce_rate": 12.3
    },
    "governance_metrics": {
      "policy_updates": 15,
      "stakeholder_participation": 78.2,
      "decision_velocity": 4.2
    },
    "trust_metrics": {
      "trust_score_avg": 94.2,
      "trust_volatility": 2.1,
      "risk_events": 0
    }
  },
  "trends": {
    "user_growth": 12.5,
    "governance_improvement": 8.3,
    "trust_stability": 98.7
  }
}
```

## 👥 User Management API

### Get User Profile
```http
GET /api/users/profile
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "project_manager",
  "permissions": [
    "read_dashboard",
    "update_governance",
    "view_analytics"
  ],
  "projects": [
    {
      "id": "uuid",
      "name": "Project Alpha",
      "role": "admin"
    }
  ],
  "created_at": "2025-01-15T10:30:00Z",
  "last_login": "2025-09-20T18:45:00Z"
}
```

### Update User Preferences
```http
PATCH /api/users/preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "notifications": {
    "email": true,
    "push": false,
    "governance_alerts": true
  },
  "dashboard_layout": "compact",
  "timezone": "UTC"
}
```

## 📊 Project Management API

### Create Project
```http
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Project",
  "description": "Project description",
  "type": "governance",
  "stakeholders": ["email1@example.com", "email2@example.com"],
  "governance_framework": "democratic",
  "privacy_level": "public"
}
```

### Get Project Details
```http
GET /api/projects/{project_id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Project Alpha",
  "description": "Strategic governance initiative",
  "status": "active",
  "governance_score": 8.7,
  "trust_score": 94.2,
  "stakeholders": [
    {
      "id": "uuid",
      "name": "John Doe",
      "role": "admin",
      "participation_rate": 92.1
    }
  ],
  "created_at": "2025-01-15T10:30:00Z",
  "last_updated": "2025-09-20T20:28:32Z"
}
```

## 🔍 Search API

### Global Search
```http
GET /api/search?q={query}&type={type}&limit={limit}
Authorization: Bearer <token>
```

**Parameters:**
- `q`: Search query
- `type`: `projects`, `users`, `policies`, `all`
- `limit`: Results limit (default: 20, max: 100)

**Response:**
```json
{
  "query": "governance policy",
  "total_results": 45,
  "results": [
    {
      "type": "policy",
      "id": "uuid",
      "title": "Stakeholder Governance Policy",
      "description": "Comprehensive policy for stakeholder engagement",
      "relevance_score": 0.95,
      "project_id": "uuid"
    }
  ],
  "facets": {
    "types": {
      "policies": 23,
      "projects": 15,
      "users": 7
    }
  }
}
```

## 📤 Notification API

### Get Notifications
```http
GET /api/notifications?status={status}&limit={limit}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "governance_alert",
      "title": "Governance Score Update",
      "message": "Your project governance score improved to 8.7",
      "status": "unread",
      "priority": "medium",
      "created_at": "2025-09-20T20:28:32Z",
      "action_url": "/projects/uuid/governance"
    }
  ],
  "unread_count": 3,
  "total_count": 45
}
```

### Mark Notification as Read
```http
PATCH /api/notifications/{notification_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "read"
}
```

## 🔄 Webhooks

### Register Webhook
```http
POST /api/webhooks
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://yourapp.com/webhook",
  "events": ["governance.score_updated", "project.created"],
  "secret": "webhook_secret_key"
}
```

### Webhook Event Format
```json
{
  "event": "governance.score_updated",
  "timestamp": "2025-09-20T20:28:32Z",
  "data": {
    "project_id": "uuid",
    "old_score": 8.5,
    "new_score": 8.7,
    "change_reason": "stakeholder_participation_increase"
  },
  "signature": "sha256=..."
}
```

## ⚠️ Error Responses

### Standard Error Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    },
    "request_id": "uuid"
  }
}
```

### Common Error Codes
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

## 📏 Rate Limits

- **Authenticated requests:** 1000 requests per hour
- **Public endpoints:** 100 requests per hour
- **Search API:** 200 requests per hour
- **Webhook endpoints:** 500 requests per hour

Rate limit headers:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1632150000
```

## 🛠️ SDKs and Integration

### JavaScript/TypeScript SDK
```bash
npm install @truststream/sdk
```

```typescript
import { TrustStreamClient } from '@truststream/sdk';

const client = new TrustStreamClient({
  apiKey: 'your_api_key',
  baseURL: 'https://api.truststream.com'
});

// Get governance score
const score = await client.governance.getScore('project_id');
```

### Python SDK
```bash
pip install truststream-python
```

```python
from truststream import TrustStreamClient

client = TrustStreamClient(api_key='your_api_key')
score = client.governance.get_score('project_id')
```

---

## 📞 Support

- **API Status:** https://status.truststream.com
- **Developer Portal:** https://developers.truststream.com
- **Support Email:** api-support@truststream.com
- **Documentation:** https://docs.truststream.com

**Last Updated:** 2025-09-20 20:28:32 UTC
