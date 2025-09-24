/**
 * Shared types and interfaces for governance agents
 */

// Agent lifecycle states
export type AgentStatus = 
  | 'initializing'
  | 'active'
  | 'busy'
  | 'degraded'
  | 'offline'
  | 'error'
  | 'maintenance';

// Agent types
export type GovernanceAgentType = 
  | 'ai-leader-efficiency'
  | 'ai-leader-quality'
  | 'ai-leader-transparency'
  | 'ai-leader-accountability'
  | 'ai-leader-innovation'
  | 'governance-coordinator';

// Event types for inter-agent communication
export type AgentEventType =
  | 'agent-status-changed'
  | 'task-assigned'
  | 'task-completed'
  | 'task-failed'
  | 'collaboration-request'
  | 'consensus-vote'
  | 'emergency-alert'
  | 'performance-update'
  | 'health-check'
  | 'governance-action'
  | 'ethics-violation'
  | 'bias-detected'
  | 'accountability-issue';

// Task priority levels
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical' | 'emergency';

// Task execution modes
export type ExecutionMode = 'sequential' | 'parallel' | 'coordinated' | 'autonomous';

// Agent configuration interface
export interface AgentConfig {
  agentId: string;
  agentType: GovernanceAgentType;
  name?: string;
  capabilities: string[];
  maxConcurrentTasks?: number;
  performanceThreshold?: number;
  healthCheckInterval?: number;
  autoScalingEnabled?: boolean;
  resourceLimits?: {
    memoryMb: number;
    cpuCores: number;
    maxRequestsPerMinute: number;
  };
  orchestratorEndpoint?: string;
  loggingLevel?: 'debug' | 'info' | 'warn' | 'error';
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
  };
}

// Agent event interface
export interface AgentEvent {
  eventId: string;
  eventType: AgentEventType;
  sourceAgentId: string;
  targetAgentId?: string;
  timestamp: Date;
  payload: any;
  priority: TaskPriority;
  correlationId?: string;
  metadata?: Record<string, any>;
}

// Task interface
export interface GovernanceTask {
  taskId: string;
  type: string;
  priority: TaskPriority;
  assignedAgentId?: string;
  sourceAgentId?: string;
  payload: any;
  requirements?: TaskRequirements;
  createdAt: Date;
  deadline?: Date;
  status: TaskStatus;
  executionMode: ExecutionMode;
  metadata?: Record<string, any>;
}

// Task requirements
export interface TaskRequirements {
  requiredCapabilities: string[];
  executionMode: ExecutionMode;
  maxExecutionTime: number;
  qualityThreshold: number;
  consensusRequired: boolean;
  collaborationNeeded?: boolean;
  resourceLimits?: {
    memoryMb: number;
    cpuCores: number;
  };
}

// Task status
export type TaskStatus = 
  | 'pending'
  | 'assigned'
  | 'executing'
  | 'waiting'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

// Task result interface
export interface TaskResult {
  taskId: string;
  agentId: string;
  status: TaskStatus;
  result?: any;
  error?: string;
  executionTime: number;
  qualityScore?: number;
  metadata?: Record<string, any>;
  timestamp: Date;
}

// Agent metrics interface
export interface AgentMetrics {
  agentId: string;
  timestamp: Date;
  status: AgentStatus;
  performanceScore: number;
  trustScore: number;
  healthScore: number;
  tasksCompleted: number;
  tasksInProgress: number;
  errorRate: number;
  averageResponseTime: number;
  resourceUsage: {
    memoryUsageMb: number;
    cpuUsagePercent: number;
    requestsPerMinute: number;
  };
  capabilities: string[];
  lastHealthCheck: Date;
}

// Health check result
export interface HealthCheckResult {
  agentId: string;
  timestamp: Date;
  status: AgentStatus;
  healthScore: number;
  checks: {
    orchestratorConnection: boolean;
    databaseConnection: boolean;
    memoryUsage: boolean;
    cpuUsage: boolean;
    taskQueueHealth: boolean;
  };
  issues?: string[];
  recommendations?: string[];
}

// Orchestrator integration interfaces
export interface OrchestratorClient {
  register(agent: GovernanceAgent): Promise<void>;
  unregister(agentId: string): Promise<void>;
  subscribeToEvents(agentId: string, eventTypes: AgentEventType[]): Promise<void>;
  unsubscribeFromEvents(agentId: string, eventTypes: AgentEventType[]): Promise<void>;
  publishEvent(event: AgentEvent): Promise<void>;
  reportMetrics(metrics: AgentMetrics): Promise<void>;
  reportHealth(healthCheck: HealthCheckResult): Promise<void>;
  requestTask(agentId: string, taskTypes: string[]): Promise<GovernanceTask | null>;
  submitTaskResult(result: TaskResult): Promise<void>;
  notifyStatusChange(agentId: string, status: AgentStatus): Promise<void>;
  getAgentConfig(agentId: string): Promise<AgentConfig | null>;
}

// Logger interface for consistent logging across agents
export interface AgentLogger {
  debug(message: string, metadata?: Record<string, any>): void;
  info(message: string, metadata?: Record<string, any>): void;
  warn(message: string, metadata?: Record<string, any>): void;
  error(message: string, error?: Error, metadata?: Record<string, any>): void;
  setLevel(level: 'debug' | 'info' | 'warn' | 'error'): void;
  setContext(context: Record<string, any>): void;
}

// Base governance agent interface
export interface GovernanceAgent {
  // Basic properties
  agentId: string;
  agentType: GovernanceAgentType;
  status: AgentStatus;
  capabilities: string[];
  
  // Core lifecycle methods
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  
  // Task management
  canHandleTask(task: GovernanceTask): boolean;
  executeTask(task: GovernanceTask): Promise<TaskResult>;
  
  // Health and monitoring
  getMetrics(): Promise<AgentMetrics>;
  performHealthCheck(): Promise<HealthCheckResult>;
  
  // Event handling
  handleEvent(event: AgentEvent): Promise<void>;
  
  // Configuration
  updateConfig(config: Partial<AgentConfig>): Promise<void>;
  getConfig(): AgentConfig;
}

// Collaboration interfaces for multi-agent coordination
export interface CollaborationRequest {
  requestId: string;
  sourceAgentId: string;
  targetAgentIds: string[];
  type: 'consensus' | 'coordination' | 'knowledge-sharing' | 'delegation';
  payload: any;
  deadline?: Date;
  priority: TaskPriority;
}

export interface CollaborationResponse {
  requestId: string;
  respondingAgentId: string;
  response: 'accept' | 'decline' | 'conditional';
  payload?: any;
  conditions?: string[];
  timestamp: Date;
}

// Error types for agent operations
export class AgentError extends Error {
  constructor(
    message: string,
    public readonly agentId: string,
    public readonly errorCode: string,
    public readonly metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

export class TaskExecutionError extends AgentError {
  constructor(
    message: string,
    agentId: string,
    public readonly taskId: string,
    metadata?: Record<string, any>
  ) {
    super(message, agentId, 'TASK_EXECUTION_ERROR', metadata);
    this.name = 'TaskExecutionError';
  }
}

export class CommunicationError extends AgentError {
  constructor(
    message: string,
    agentId: string,
    public readonly targetAgentId?: string,
    metadata?: Record<string, any>
  ) {
    super(message, agentId, 'COMMUNICATION_ERROR', metadata);
    this.name = 'CommunicationError';
  }
}

export class ConfigurationError extends AgentError {
  constructor(
    message: string,
    agentId: string,
    metadata?: Record<string, any>
  ) {
    super(message, agentId, 'CONFIGURATION_ERROR', metadata);
    this.name = 'ConfigurationError';
  }
}
