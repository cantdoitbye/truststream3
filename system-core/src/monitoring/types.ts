/**
 * Backend-agnostic monitoring and analytics interfaces
 * Supports multiple backends while maintaining consistent API
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum EventType {
  // AI Agent Events
  AGENT_START = 'agent_start',
  AGENT_COMPLETE = 'agent_complete',
  AGENT_ERROR = 'agent_error',
  AGENT_TOOL_USE = 'agent_tool_use',
  
  // Model Performance Events
  MODEL_INFERENCE = 'model_inference',
  MODEL_ERROR = 'model_error',
  MODEL_LATENCY = 'model_latency',
  
  // System Health Events
  SYSTEM_HEALTH = 'system_health',
  RESOURCE_USAGE = 'resource_usage',
  API_REQUEST = 'api_request',
  
  // Analytics Events
  ANOMALY_DETECTED = 'anomaly_detected',
  PREDICTION_GENERATED = 'prediction_generated',
  ALERT_TRIGGERED = 'alert_triggered'
}

export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  TIMER = 'timer'
}

export interface LogEntry {
  id?: string;
  timestamp: Date;
  level: LogLevel;
  eventType: EventType;
  message: string;
  
  // Context information
  agentId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  
  // Performance data
  duration?: number;
  modelName?: string;
  tokenCount?: number;
  
  // System data
  memoryUsage?: number;
  cpuUsage?: number;
  
  // Additional metadata
  metadata?: Record<string, any>;
  tags?: string[];
  
  // Error information
  error?: {
    code: string;
    stack?: string;
    details?: Record<string, any>;
  };
}

export interface PerformanceMetric {
  id?: string;
  timestamp: Date;
  metricType: MetricType;
  name: string;
  value: number;
  unit?: string;
  
  // Context
  agentId?: string;
  modelName?: string;
  userId?: string;
  sessionId?: string;
  
  // Dimensions for grouping
  dimensions?: Record<string, string>;
  
  // Additional metadata
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface AnalyticsQuery {
  // Time range
  startTime?: Date;
  endTime?: Date;
  
  // Filtering
  eventTypes?: EventType[];
  logLevels?: LogLevel[];
  agentIds?: string[];
  userIds?: string[];
  modelNames?: string[];
  
  // Grouping and aggregation
  groupBy?: string[];
  aggregations?: {
    field: string;
    function: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'percentile';
    percentile?: number;
  }[];
  
  // Pagination
  limit?: number;
  offset?: number;
  
  // Ordering
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  }[];
}

export interface AnalyticsResult {
  data: any[];
  totalCount?: number;
  aggregations?: Record<string, number>;
  metadata?: {
    queryDuration: number;
    cacheHit?: boolean;
  };
}

export interface AnomalyDetectionConfig {
  metric: string;
  threshold?: number;
  sensitivity: 'low' | 'medium' | 'high';
  lookbackPeriod: number; // in minutes
  minDataPoints: number;
  algorithm: 'statistical' | 'ml' | 'threshold';
}

export interface Anomaly {
  id: string;
  timestamp: Date;
  metric: string;
  value: number;
  expectedValue?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  context?: Record<string, any>;
}

export interface Alert {
  id: string;
  timestamp: Date;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  
  // Alert conditions
  condition: {
    metric?: string;
    threshold?: number;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  };
  
  // Alert state
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  
  // Additional data
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface PredictionRequest {
  metric: string;
  forecastPeriod: number; // in minutes
  confidence?: number;
  includeSeasonality?: boolean;
  model?: 'linear' | 'arima' | 'prophet';
}

export interface Prediction {
  metric: string;
  timestamp: Date;
  forecastPeriod: number;
  predictions: {
    timestamp: Date;
    value: number;
    confidenceInterval?: {
      lower: number;
      upper: number;
    };
  }[];
  confidence: number;
  model: string;
  metadata?: Record<string, any>;
}

export interface SystemHealth {
  timestamp: Date;
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency?: number;
    errorRate?: number;
    lastCheck: Date;
    details?: Record<string, any>;
  }[];
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLatency?: number;
  };
}

/**
 * Main interface that all monitoring backends must implement
 * This provides backend-agnostic access to monitoring functionality
 */
export interface MonitoringBackend {
  // Basic logging
  log(entry: LogEntry): Promise<void>;
  
  // Performance tracking
  track(metric: PerformanceMetric): Promise<void>;
  trackBatch(metrics: PerformanceMetric[]): Promise<void>;
  
  // Querying and analytics
  query(query: AnalyticsQuery): Promise<AnalyticsResult>;
  getLogs(query: Partial<AnalyticsQuery>): Promise<LogEntry[]>;
  getMetrics(query: Partial<AnalyticsQuery>): Promise<PerformanceMetric[]>;
  
  // Anomaly detection
  detectAnomalies(config: AnomalyDetectionConfig): Promise<Anomaly[]>;
  getAnomalies(startTime?: Date, endTime?: Date): Promise<Anomaly[]>;
  
  // Alerting
  createAlert(alert: Omit<Alert, 'id' | 'timestamp'>): Promise<Alert>;
  getAlerts(status?: Alert['status']): Promise<Alert[]>;
  acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void>;
  resolveAlert(alertId: string): Promise<void>;
  
  // Predictions
  generatePrediction(request: PredictionRequest): Promise<Prediction>;
  getPredictions(metric?: string): Promise<Prediction[]>;
  
  // System health
  getSystemHealth(): Promise<SystemHealth>;
  updateSystemHealth(health: SystemHealth): Promise<void>;
  
  // Maintenance
  cleanup(olderThan: Date): Promise<number>;
  initialize(): Promise<void>;
  destroy(): Promise<void>;
}

/**
 * Configuration for monitoring backend initialization
 */
export interface MonitoringConfig {
  backend: 'supabase' | 'mongodb' | 'postgresql' | 'memory';
  
  // Connection settings (backend-specific)
  connection?: {
    url?: string;
    apiKey?: string;
    database?: string;
    [key: string]: any;
  };
  
  // Feature settings
  features?: {
    enableAnomalyDetection?: boolean;
    enablePredictions?: boolean;
    enableSystemHealth?: boolean;
    retentionDays?: number;
  };
  
  // Performance settings
  batchSize?: number;
  flushInterval?: number;
  maxCacheSize?: number;
}

/**
 * Factory interface for creating monitoring backends
 */
export interface MonitoringBackendFactory {
  create(config: MonitoringConfig): Promise<MonitoringBackend>;
  supports(backendType: string): boolean;
}