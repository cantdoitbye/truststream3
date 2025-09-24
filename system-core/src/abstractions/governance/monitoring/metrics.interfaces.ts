/**
 * @fileoverview Metrics collection system interfaces for governance agents
 * @version 1.0.0
 * @author TrustStream Health Monitoring System
 * @description Comprehensive interfaces for real-time metrics collection,
 * aggregation, and storage in the governance agent ecosystem.
 */

import { IMetric, MetricType, AlertSeverity } from './health.interfaces';

/**
 * Interface for metrics collection configuration
 * Defines how metrics should be collected from governance agents
 */
export interface IMetricsCollectionConfig {
  /** Unique identifier for the collection configuration */
  id: string;
  
  /** Agent ID this configuration applies to */
  agentId: string;
  
  /** Collection interval in seconds */
  intervalSeconds: number;
  
  /** Metrics to collect from this agent */
  enabledMetrics: Array<{
    type: MetricType;
    enabled: boolean;
    customThresholds?: {
      warning: number;
      critical: number;
    };
    samplingRate?: number; // 0-1, for high-frequency metrics
  }>;
  
  /** Batch size for metric collection */
  batchSize: number;
  
  /** Maximum time to wait for metric collection (seconds) */
  timeoutSeconds: number;
  
  /** Storage configuration for collected metrics */
  storage: {
    /** Primary storage backend */
    primary: 'memory' | 'database' | 'time_series_db';
    
    /** Secondary storage for archival */
    archive?: 'file' | 'cloud_storage' | 'data_warehouse';
    
    /** How long to keep metrics in primary storage (hours) */
    retentionHours: number;
    
    /** Compression settings for stored metrics */
    compression?: {
      enabled: boolean;
      algorithm: 'gzip' | 'lz4' | 'snappy';
      level?: number;
    };
  };
  
  /** Error handling configuration */
  errorHandling: {
    /** Maximum number of consecutive failures before disabling collection */
    maxConsecutiveFailures: number;
    
    /** Retry configuration for failed collections */
    retryPolicy: {
      maxRetries: number;
      backoffMultiplier: number;
      maxBackoffSeconds: number;
    };
    
    /** Whether to continue collecting other metrics if one fails */
    continueOnPartialFailure: boolean;
  };
  
  /** Whether this configuration is currently active */
  enabled: boolean;
  
  /** Configuration metadata */
  metadata?: Record<string, any>;
}

/**
 * Interface for real-time metrics collector
 * Handles the actual collection of metrics from governance agents
 */
export interface IMetricsCollector {
  /** Unique identifier for the collector instance */
  id: string;
  
  /** Configuration used by this collector */
  config: IMetricsCollectionConfig;
  
  /** Current status of the collector */
  status: 'idle' | 'collecting' | 'error' | 'disabled';
  
  /** Statistics about collection performance */
  statistics: {
    /** Total metrics collected since start */
    totalCollected: number;
    
    /** Number of successful collections */
    successfulCollections: number;
    
    /** Number of failed collections */
    failedCollections: number;
    
    /** Average collection time in milliseconds */
    averageCollectionTime: number;
    
    /** Last collection timestamp */
    lastCollectionAt?: string;
    
    /** Current error rate (failures/total attempts) */
    errorRate: number;
  };
  
  /** Currently queued metrics waiting to be processed */
  queuedMetrics: IMetric[];
  
  /** Queue management settings */
  queue: {
    /** Maximum number of metrics to queue */
    maxSize: number;
    
    /** Current queue size */
    currentSize: number;
    
    /** Whether to drop oldest metrics when queue is full */
    dropOldestOnFull: boolean;
    
    /** Metrics processing rate (metrics per second) */
    processingRate: number;
  };
  
  /** Active collection tasks */
  activeTasks: Array<{
    taskId: string;
    metricType: MetricType;
    startedAt: string;
    status: 'running' | 'completed' | 'failed';
    progress?: number; // 0-100
  }>;
  
  /** Collector health information */
  health: {
    /** Overall health status */
    status: 'healthy' | 'degraded' | 'unhealthy';
    
    /** Resource usage by the collector itself */
    resourceUsage: {
      cpuPercent: number;
      memoryMB: number;
      networkBytesPerSecond: number;
    };
    
    /** Performance indicators */
    performance: {
      throughput: number; // metrics per second
      latency: number; // average processing latency in ms
      backlog: number; // number of pending metrics
    };
  };
}

/**
 * Interface for metrics aggregation and processing
 * Handles real-time aggregation and statistical analysis of collected metrics
 */
export interface IMetricsAggregator {
  /** Unique identifier for the aggregator */
  id: string;
  
  /** Aggregation configuration */
  config: {
    /** Time windows for aggregation (in seconds) */
    timeWindows: number[];
    
    /** Statistical functions to compute */
    aggregationFunctions: Array<'avg' | 'min' | 'max' | 'sum' | 'count' | 'stddev' | 'percentile'>;
    
    /** Percentiles to calculate (for percentile function) */
    percentiles?: number[];
    
    /** Whether to calculate moving averages */
    movingAverages: {
      enabled: boolean;
      windows: number[]; // time windows in seconds
    };
    
    /** Whether to detect anomalies during aggregation */
    anomalyDetection: {
      enabled: boolean;
      sensitivity: 'low' | 'medium' | 'high';
      algorithms: string[];
    };
  };
  
  /** Current aggregated metrics by time window */
  aggregatedMetrics: Record<string, Array<{
    timeWindow: number;
    timestamp: string;
    agentId: string;
    metricType: MetricType;
    aggregations: Record<string, number>;
    sampleCount: number;
  }>>;
  
  /** Real-time streaming aggregates (latest values) */
  streamingAggregates: Record<string, {
    agentId: string;
    metricType: MetricType;
    currentValue: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    changeRate: number; // rate of change per second
    lastUpdated: string;
  }>;
  
  /** Aggregation performance metrics */
  performance: {
    /** Metrics processed per second */
    throughput: number;
    
    /** Average aggregation latency */
    latency: number;
    
    /** Memory usage for aggregation buffers */
    memoryUsage: number;
    
    /** Number of active aggregation windows */
    activeWindows: number;
  };
}

/**
 * Interface for metrics storage and retrieval
 * Manages persistent storage and efficient querying of historical metrics
 */
export interface IMetricsStorage {
  /** Storage backend identifier */
  id: string;
  
  /** Storage configuration */
  config: {
    /** Storage backend type */
    backend: 'memory' | 'postgresql' | 'influxdb' | 'prometheus' | 'elasticsearch';
    
    /** Connection settings */
    connection: {
      host?: string;
      port?: number;
      database?: string;
      credentials?: Record<string, string>;
      connectionPool?: {
        minConnections: number;
        maxConnections: number;
        idleTimeoutMs: number;
      };
    };
    
    /** Partitioning strategy for large datasets */
    partitioning: {
      enabled: boolean;
      strategy: 'time' | 'agent' | 'metric_type';
      interval?: 'hour' | 'day' | 'week' | 'month';
    };
    
    /** Indexing configuration for query performance */
    indexing: {
      /** Fields to index */
      indexes: Array<{
        fields: string[];
        type: 'btree' | 'hash' | 'gin' | 'gist';
        unique?: boolean;
      }>;
      
      /** Whether to auto-create indexes based on query patterns */
      autoIndexing: boolean;
    };
    
    /** Data compression and optimization */
    optimization: {
      compression: {
        enabled: boolean;
        algorithm: string;
        level: number;
      };
      
      /** Automatic cleanup of old data */
      cleanup: {
        enabled: boolean;
        retentionDays: number;
        cleanupIntervalHours: number;
      };
    };
  };
  
  /** Storage performance metrics */
  performance: {
    /** Write operations per second */
    writeOps: number;
    
    /** Read operations per second */
    readOps: number;
    
    /** Average write latency (ms) */
    writeLatency: number;
    
    /** Average read latency (ms) */
    readLatency: number;
    
    /** Storage space utilization */
    spaceUtilization: {
      totalSizeBytes: number;
      usedSizeBytes: number;
      availableSizeBytes: number;
    };
    
    /** Connection pool status */
    connectionPool: {
      activeConnections: number;
      idleConnections: number;
      waitingQueries: number;
    };
  };
  
  /** Storage health status */
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastHealthCheck: string;
    issues: Array<{
      type: string;
      severity: AlertSeverity;
      description: string;
      detectedAt: string;
    }>;
  };
}

/**
 * Interface for metrics query and analysis
 * Provides powerful querying capabilities for historical metrics analysis
 */
export interface IMetricsQuery {
  /** Query identifier */
  id: string;
  
  /** Query definition */
  query: {
    /** Agent IDs to query (empty array = all agents) */
    agentIds: string[];
    
    /** Metric types to include */
    metricTypes: MetricType[];
    
    /** Time range for the query */
    timeRange: {
      start: string; // ISO 8601 timestamp
      end: string;   // ISO 8601 timestamp
    };
    
    /** Aggregation settings */
    aggregation?: {
      /** Time bucket size for grouping (e.g., '1h', '5m', '1d') */
      interval: string;
      
      /** Aggregation functions to apply */
      functions: string[];
      
      /** Group by fields */
      groupBy?: string[];
    };
    
    /** Filtering conditions */
    filters?: Array<{
      field: string;
      operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'not_in';
      value: any;
    }>;
    
    /** Sorting configuration */
    orderBy?: Array<{
      field: string;
      direction: 'asc' | 'desc';
    }>;
    
    /** Result limiting */
    limit?: number;
    offset?: number;
  };
  
  /** Query execution status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  
  /** Query execution metadata */
  execution: {
    /** When the query was submitted */
    submittedAt: string;
    
    /** When execution started */
    startedAt?: string;
    
    /** When execution completed */
    completedAt?: string;
    
    /** Execution duration in milliseconds */
    durationMs?: number;
    
    /** Number of metrics scanned */
    metricsScanned?: number;
    
    /** Number of results returned */
    resultsCount?: number;
    
    /** Query execution plan (for optimization) */
    executionPlan?: string;
  };
  
  /** Query results */
  results?: Array<{
    timestamp: string;
    agentId: string;
    metricType: MetricType;
    value: number;
    metadata?: Record<string, any>;
  }>;
  
  /** Error information if query failed */
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

/**
 * Interface for real-time metrics streaming
 * Supports live metrics feeds and subscriptions
 */
export interface IMetricsStream {
  /** Stream identifier */
  id: string;
  
  /** Stream configuration */
  config: {
    /** Agent IDs to stream from */
    agentIds: string[];
    
    /** Metric types to include in stream */
    metricTypes: MetricType[];
    
    /** Stream mode */
    mode: 'real_time' | 'batch' | 'hybrid';
    
    /** Filtering conditions for the stream */
    filters?: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
    
    /** Buffer configuration */
    buffer: {
      /** Maximum buffer size */
      maxSize: number;
      
      /** Buffer flush interval (seconds) */
      flushInterval: number;
      
      /** Whether to drop old data when buffer is full */
      dropOnFull: boolean;
    };
    
    /** Quality of service settings */
    qos: {
      /** Delivery guarantee */
      delivery: 'at_most_once' | 'at_least_once' | 'exactly_once';
      
      /** Maximum acceptable latency (ms) */
      maxLatency: number;
      
      /** Whether to prioritize throughput over latency */
      prioritizeThroughput: boolean;
    };
  };
  
  /** Current stream status */
  status: 'active' | 'paused' | 'stopped' | 'error';
  
  /** Stream statistics */
  statistics: {
    /** Total metrics streamed */
    totalMetrics: number;
    
    /** Current streaming rate (metrics/second) */
    currentRate: number;
    
    /** Average latency from collection to delivery */
    averageLatency: number;
    
    /** Number of connected subscribers */
    subscriberCount: number;
    
    /** Stream uptime */
    uptimeSeconds: number;
    
    /** Error count */
    errorCount: number;
  };
  
  /** Active subscribers to this stream */
  subscribers: Array<{
    subscriberId: string;
    connectedAt: string;
    lastActivity: string;
    deliveredMetrics: number;
    subscriberType: 'dashboard' | 'alert_system' | 'analytics' | 'external';
  }>;
}

/**
 * Interface for metrics export and integration
 * Supports exporting metrics to external systems and formats
 */
export interface IMetricsExporter {
  /** Exporter identifier */
  id: string;
  
  /** Export configuration */
  config: {
    /** Target system or format */
    target: 'prometheus' | 'grafana' | 'datadog' | 'csv' | 'json' | 'parquet';
    
    /** Export schedule */
    schedule: {
      /** Export frequency */
      frequency: 'real_time' | 'hourly' | 'daily' | 'weekly';
      
      /** Specific times for scheduled exports */
      times?: string[];
      
      /** Time zone for scheduling */
      timezone?: string;
    };
    
    /** Data selection criteria */
    selection: {
      /** Agent IDs to export */
      agentIds: string[];
      
      /** Metric types to include */
      metricTypes: MetricType[];
      
      /** Time range for each export */
      timeRange: 'last_hour' | 'last_day' | 'last_week' | 'custom';
      
      /** Custom time range if applicable */
      customRange?: {
        hours: number;
      };
    };
    
    /** Export format configuration */
    format: {
      /** Compression settings */
      compression?: {
        enabled: boolean;
        format: 'gzip' | 'bzip2' | 'xz';
      };
      
      /** Field mapping for external systems */
      fieldMapping?: Record<string, string>;
      
      /** Additional metadata to include */
      includeMetadata: boolean;
    };
    
    /** Destination configuration */
    destination: {
      /** Output location */
      location: string; // URL, file path, or system identifier
      
      /** Authentication credentials */
      credentials?: Record<string, string>;
      
      /** Retry configuration for failed exports */
      retry: {
        maxAttempts: number;
        backoffSeconds: number;
      };
    };
  };
  
  /** Export status and history */
  status: {
    /** Current export status */
    current: 'idle' | 'exporting' | 'error';
    
    /** Last export information */
    lastExport?: {
      startedAt: string;
      completedAt: string;
      metricsExported: number;
      status: 'success' | 'failure' | 'partial';
      error?: string;
    };
    
    /** Export statistics */
    statistics: {
      totalExports: number;
      successfulExports: number;
      failedExports: number;
      totalMetricsExported: number;
      averageExportTime: number;
    };
  };
}