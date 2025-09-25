# N8N Agent Workflow Ingestion Feature - Design Document

## 🎯 Feature Overview

This feature enables TrustStream users to upload n8n workflow JSON files to automatically create fully functional AI agents. The platform will:

1. **Parse n8n workflow files** - Extract workflow logic, nodes, and connections
2. **Convert to AI agents** - Transform workflow into executable agent code
3. **Deploy agents** - Host agents on TrustStream infrastructure
4. **Credit-based billing** - Deduct compute/GPU costs via ooumph coin
5. **User management** - Provide agent management interface

## 🏗️ Architecture Design

### Core Components

#### 1. Workflow Ingestion Service
```python
class N8NWorkflowIngestion:
    """Handles n8n workflow file upload and parsing"""
    
    def upload_workflow(self, file: UploadFile, user_id: str) -> Dict
    def parse_n8n_json(self, workflow_json: Dict) -> WorkflowModel
    def validate_workflow(self, workflow: WorkflowModel) -> ValidationResult
    def estimate_resources(self, workflow: WorkflowModel) -> ResourceEstimate
```

#### 2. Agent Code Generator
```python
class AgentCodeGenerator:
    """Converts n8n workflows to executable agent code"""
    
    def generate_agent_code(self, workflow: WorkflowModel) -> AgentCode
    def create_mcp_server(self, agent_code: AgentCode) -> MCPServer
    def package_deployment(self, mcp_server: MCPServer) -> DeploymentPackage
```

#### 3. Credit Management System
```python
class OoumphCreditManager:
    """Manages ooumph coin billing for agent hosting"""
    
    def calculate_costs(self, resource_usage: ResourceUsage) -> Cost
    def deduct_credits(self, user_id: str, cost: Cost) -> Transaction
    def monitor_usage(self, agent_id: str) -> UsageMetrics
    def auto_scale_billing(self, agent_id: str, metrics: UsageMetrics) -> None
```

#### 4. Agent Hosting Infrastructure
```python
class AgentHostingService:
    """Manages agent deployment and hosting"""
    
    def deploy_agent(self, package: DeploymentPackage) -> DeployedAgent
    def scale_agent(self, agent_id: str, demand: ScalingMetrics) -> None
    def monitor_health(self, agent_id: str) -> HealthStatus
    def manage_lifecycle(self, agent_id: str, action: LifecycleAction) -> None
```

## 📊 Database Schema

### N8N Workflows Table
```sql
CREATE TABLE n8n_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    description TEXT,
    workflow_json JSONB NOT NULL,
    original_filename TEXT,
    status workflow_status DEFAULT 'uploaded',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Workflow metadata
    node_count INTEGER,
    complexity_score INTEGER,
    estimated_cost_per_run DECIMAL(10,4),
    
    CONSTRAINT valid_workflow_json CHECK (jsonb_typeof(workflow_json) = 'object')
);

-- Enum for workflow status
CREATE TYPE workflow_status AS ENUM (
    'uploaded', 'parsing', 'parsed', 'validating', 'validated', 
    'generating', 'generated', 'deploying', 'deployed', 'active', 
    'paused', 'error', 'archived'
);
```

### Generated Agents Table
```sql
CREATE TABLE generated_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES n8n_workflows(id),
    user_id UUID REFERENCES auth.users(id),
    agent_name TEXT NOT NULL,
    agent_code TEXT NOT NULL,
    mcp_server_config JSONB,
    deployment_config JSONB,
    
    -- Resource specifications
    cpu_allocation DECIMAL(4,2) DEFAULT 0.5,
    memory_mb INTEGER DEFAULT 512,
    gpu_allocation DECIMAL(4,2) DEFAULT 0.0,
    storage_mb INTEGER DEFAULT 100,
    
    -- Status and metrics
    status agent_status DEFAULT 'created',
    endpoint_url TEXT,
    health_check_url TEXT,
    last_health_check TIMESTAMPTZ,
    
    -- Billing
    total_runtime_seconds BIGINT DEFAULT 0,
    total_credits_consumed DECIMAL(15,6) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enum for agent status
CREATE TYPE agent_status AS ENUM (
    'created', 'deploying', 'active', 'paused', 'error', 
    'updating', 'scaling', 'terminated'
);
```

### Agent Usage Tracking
```sql
CREATE TABLE agent_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES generated_agents(id),
    user_id UUID REFERENCES auth.users(id),
    
    -- Usage metrics
    execution_id TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    -- Resource usage
    cpu_seconds DECIMAL(10,4),
    memory_mb_seconds DECIMAL(10,4),
    gpu_seconds DECIMAL(10,4),
    storage_mb_seconds DECIMAL(10,4),
    
    -- Billing
    cost_ooumph_coins DECIMAL(15,6),
    billing_status billing_status DEFAULT 'pending',
    
    -- Request metadata
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    api_calls INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enum for billing status
CREATE TYPE billing_status AS ENUM ('pending', 'billed', 'failed', 'refunded');
```

### Credit Management
```sql
CREATE TABLE ooumph_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    agent_id UUID REFERENCES generated_agents(id),
    usage_log_id UUID REFERENCES agent_usage_logs(id),
    
    transaction_type transaction_type NOT NULL,
    amount DECIMAL(15,6) NOT NULL,
    balance_after DECIMAL(15,6) NOT NULL,
    description TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enum for transaction types
CREATE TYPE transaction_type AS ENUM (
    'purchase', 'bonus', 'agent_usage', 'refund', 'adjustment'
);
```

## 🔧 Implementation Plan

### Phase 1: Core Infrastructure (Week 1-2)
1. **Database Setup**
   - Create tables and schemas
   - Set up migration scripts
   - Configure indexes and constraints

2. **Basic Upload Service**
   - File upload endpoint
   - JSON validation
   - Storage in Supabase

3. **n8n Parser Development**
   - JSON structure analysis
   - Node type identification
   - Connection mapping

### Phase 2: Agent Generation (Week 3-4)
1. **Code Generation Engine**
   - Template system for agent code
   - MCP server generation
   - Tool mapping from n8n nodes

2. **Validation System**
   - Workflow compatibility checks
   - Resource requirement estimation
   - Security validation

3. **Testing Framework**
   - Unit tests for generated code
   - Integration testing
   - Performance benchmarks

### Phase 3: Hosting Infrastructure (Week 5-6)
1. **Container Orchestration**
   - Docker image creation
   - Kubernetes deployment
   - Auto-scaling configuration

2. **Load Balancing**
   - Traffic distribution
   - Health monitoring
   - Failover handling

3. **Resource Management**
   - CPU/Memory allocation
   - GPU scheduling (if needed)
   - Storage provisioning

### Phase 4: Credit System (Week 7-8)
1. **Billing Engine**
   - Real-time usage tracking
   - Cost calculation algorithms
   - Credit deduction system

2. **Usage Monitoring**
   - Metrics collection
   - Performance analytics
   - Cost optimization

3. **User Interface**
   - Dashboard for usage stats
   - Billing history
   - Credit management

## 💰 Pricing Strategy

### Resource-Based Pricing (Ooumph Coins)
```
CPU Time: 0.001 ooumph/second
Memory: 0.0001 ooumph/MB/second  
GPU Time: 0.01 ooumph/second (when available)
Storage: 0.00001 ooumph/MB/day
API Calls: 0.0001 ooumph/call
```

### Complexity-Based Multipliers
- Simple workflows (1-5 nodes): 1.0x
- Medium workflows (6-15 nodes): 1.5x
- Complex workflows (16+ nodes): 2.0x
- AI-intensive workflows: 3.0x

### Free Tier
- 100 ooumph coins monthly
- Up to 3 active agents
- Basic monitoring
- Community support

## 🔒 Security Considerations

### Input Validation
- Sanitize uploaded JSON files
- Validate node configurations
- Check for malicious code patterns
- Limit workflow complexity

### Sandbox Execution
- Isolated container environments
- Limited network access
- Resource constraints
- Monitoring and alerting

### Data Protection
- Encrypt sensitive workflow data
- Secure credential storage
- Audit logging
- GDPR compliance

## 📈 Monitoring and Analytics

### Agent Performance Metrics
- Response time
- Error rates
- Resource utilization
- User satisfaction

### Business Metrics
- Upload success rate
- Agent activation rate
- Revenue per user
- Churn analysis

### System Health
- Infrastructure utilization
- Scaling events
- Cost optimization
- Performance bottlenecks

## 🚀 Future Enhancements

### Advanced Features
- Visual workflow editor
- Agent collaboration
- Marketplace for agents
- Advanced AI integrations

### Optimization
- Intelligent resource allocation
- Predictive scaling
- Cost optimization algorithms
- Performance tuning

### Integration
- External API connectors
- Third-party tool integrations
- Enterprise features
- White-label solutions

---

**Author**: MiniMax Agent  
**Status**: Design Phase  
**Priority**: High  
**Estimated Effort**: 8 weeks  
**Dependencies**: TrustStream v4.4, Supabase, Container orchestration