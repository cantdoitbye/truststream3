/**
 * @fileoverview Health dashboard data structures and interfaces
 * @version 1.0.0
 * @author TrustStream Health Monitoring System
 * @description Comprehensive interfaces for health monitoring dashboard components,
 * data visualization, and real-time monitoring displays in the governance agent ecosystem.
 */

import { 
  IMetric, 
  MetricType, 
  AlertSeverity, 
  HealthLevel, 
  IAlert, 
  IHealthStatus 
} from './health.interfaces';
import { IPredictionResult } from './predictive.interfaces';
import { IHealthCheckResult } from './health-checks.interfaces';
import { IRecoveryExecution } from './auto-recovery.interfaces';

/**
 * Enumeration of dashboard widget types
 */
export enum DashboardWidgetType {
  METRIC_CHART = 'metric_chart',
  HEALTH_STATUS = 'health_status',
  ALERT_LIST = 'alert_list',
  RECOVERY_STATUS = 'recovery_status',
  PREDICTION_GRAPH = 'prediction_graph',
  SYSTEM_OVERVIEW = 'system_overview',
  TOPOLOGY_MAP = 'topology_map',
  PERFORMANCE_HEATMAP = 'performance_heatmap',
  TREND_ANALYSIS = 'trend_analysis',
  REAL_TIME_FEED = 'real_time_feed',
  CUSTOM_WIDGET = 'custom_widget'
}

/**
 * Enumeration of chart types for data visualization
 */
export enum ChartType {
  LINE_CHART = 'line_chart',
  BAR_CHART = 'bar_chart',
  AREA_CHART = 'area_chart',
  PIE_CHART = 'pie_chart',
  SCATTER_PLOT = 'scatter_plot',
  HEATMAP = 'heatmap',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  BOX_PLOT = 'box_plot',
  CANDLESTICK = 'candlestick',
  TREEMAP = 'treemap',
  SANKEY = 'sankey'
}

/**
 * Interface for dashboard configuration and layout
 * Defines the overall structure and organization of the monitoring dashboard
 */
export interface IDashboardConfig {
  /** Unique dashboard identifier */
  id: string;
  
  /** Dashboard name and metadata */
  name: string;
  description: string;
  
  /** Dashboard layout configuration */
  layout: {
    /** Grid system configuration */
    grid: {
      /** Number of columns in the grid */
      columns: number;
      
      /** Row height in pixels */
      rowHeight: number;
      
      /** Margin between widgets */
      margin: [number, number]; // [x, y]
      
      /** Padding inside widgets */
      padding: [number, number]; // [x, y]
    };
    
    /** Responsive breakpoints */
    breakpoints: Record<string, {
      cols: number;
      width: number;
    }>;
    
    /** Theme and styling */
    theme: {
      /** Primary color scheme */
      primaryColors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        surface: string;
        text: string;
      };
      
      /** Severity color mapping */
      severityColors: Record<AlertSeverity, string>;
      
      /** Health level color mapping */
      healthColors: Record<HealthLevel, string>;
      
      /** Chart color palette */
      chartColors: string[];
      
      /** Font configuration */
      typography: {
        fontFamily: string;
        fontSize: {
          small: number;
          medium: number;
          large: number;
          xlarge: number;
        };
      };
    };
  };
  
  /** Widget configurations */
  widgets: Array<{
    /** Widget identifier */
    id: string;
    
    /** Widget type */
    type: DashboardWidgetType;
    
    /** Widget position and size */
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    
    /** Widget configuration */
    config: Record<string, any>;
    
    /** Widget-specific styling overrides */
    style?: Record<string, any>;
  }>;
  
  /** Global dashboard settings */
  settings: {
    /** Auto-refresh configuration */
    autoRefresh: {
      enabled: boolean;
      interval: number; // seconds
      pauseOnUserInteraction: boolean;
    };
    
    /** Time range settings */
    timeRange: {
      /** Default time range */
      default: string; // e.g., '1h', '24h', '7d'
      
      /** Available time range options */
      options: string[];
      
      /** Custom time range support */
      customRangeEnabled: boolean;
    };
    
    /** Data aggregation settings */
    aggregation: {
      /** Default aggregation method */
      defaultMethod: 'avg' | 'sum' | 'min' | 'max' | 'count';
      
      /** Aggregation intervals */
      intervals: string[]; // e.g., ['1m', '5m', '1h', '1d']
    };
    
    /** Export and sharing */
    export: {
      /** Supported export formats */
      supportedFormats: string[];
      
      /** Enable dashboard sharing */
      sharingEnabled: boolean;
      
      /** Public dashboard access */
      publicAccess: boolean;
    };
  };
  
  /** Dashboard access control */
  access: {
    /** Owner information */
    owner: {
      userId: string;
      userName: string;
      email: string;
    };
    
    /** Shared access permissions */
    permissions: Array<{
      userId: string;
      permission: 'view' | 'edit' | 'admin';
      grantedAt: string;
      grantedBy: string;
    }>;
    
    /** Team or role-based access */
    teamAccess?: Array<{
      teamId: string;
      permission: 'view' | 'edit';
    }>;
  };
  
  /** Dashboard metadata */
  metadata: {
    /** Creation information */
    createdAt: string;
    createdBy: string;
    
    /** Last modification */
    lastModifiedAt: string;
    lastModifiedBy: string;
    
    /** Dashboard version */
    version: string;
    
    /** Tags for organization */
    tags: string[];
    
    /** Dashboard category */
    category: string;
    
    /** Usage statistics */
    usage: {
      viewCount: number;
      lastViewed: string;
      averageViewDuration: number;
    };
  };
}

/**
 * Interface for dashboard widget configuration and behavior
 * Defines individual widget properties and data binding
 */
export interface IDashboardWidget {
  /** Widget identifier */
  id: string;
  
  /** Widget type */
  type: DashboardWidgetType;
  
  /** Widget metadata */
  metadata: {
    title: string;
    description?: string;
    tags?: string[];
  };
  
  /** Data source configuration */
  dataSource: {
    /** Primary data source */
    primary: {
      /** Source type */
      type: 'metrics' | 'alerts' | 'health_checks' | 'predictions' | 'recovery' | 'custom';
      
      /** Source configuration */
      config: Record<string, any>;
      
      /** Data refresh settings */
      refresh: {
        interval: number; // seconds
        strategy: 'poll' | 'push' | 'hybrid';
      };
    };
    
    /** Additional data sources */
    secondary?: Array<{
      type: string;
      config: Record<string, any>;
      alias: string;
    }>;
    
    /** Data transformation pipeline */
    transformations?: Array<{
      type: 'filter' | 'aggregate' | 'join' | 'calculate' | 'format';
      config: Record<string, any>;
      order: number;
    }>;
  };
  
  /** Visualization configuration */
  visualization: {
    /** Chart type (if applicable) */
    chartType?: ChartType;
    
    /** Chart configuration */
    chartConfig?: {
      /** Axes configuration */
      axes?: {
        x: {
          label: string;
          type: 'time' | 'linear' | 'logarithmic' | 'category';
          format?: string;
          min?: number;
          max?: number;
        };
        y: {
          label: string;
          type: 'linear' | 'logarithmic';
          format?: string;
          min?: number;
          max?: number;
        };
      };
      
      /** Series configuration */
      series?: Array<{
        name: string;
        color?: string;
        type?: string;
        yAxis?: 'left' | 'right';
      }>;
      
      /** Legend configuration */
      legend?: {
        enabled: boolean;
        position: 'top' | 'bottom' | 'left' | 'right';
        alignment: 'start' | 'center' | 'end';
      };
      
      /** Interaction settings */
      interactions?: {
        zoom: boolean;
        pan: boolean;
        crossfilter: boolean;
        tooltip: {
          enabled: boolean;
          format?: string;
        };
      };
    };
    
    /** Display options */
    display: {
      /** Show data labels */
      showDataLabels: boolean;
      
      /** Show grid lines */
      showGridLines: boolean;
      
      /** Animation settings */
      animations: {
        enabled: boolean;
        duration: number;
        easing: string;
      };
      
      /** Color scheme */
      colorScheme?: string[];
      
      /** Conditional formatting rules */
      conditionalFormatting?: Array<{
        condition: string;
        style: Record<string, any>;
      }>;
    };
  };
  
  /** Widget behavior configuration */
  behavior: {
    /** Interactivity settings */
    interactive: boolean;
    
    /** Click actions */
    clickActions?: Array<{
      action: 'drill_down' | 'navigate' | 'filter' | 'alert' | 'custom';
      config: Record<string, any>;
    }>;
    
    /** Filter capabilities */
    filtering: {
      enabled: boolean;
      filterFields: string[];
      defaultFilters?: Record<string, any>;
    };
    
    /** Real-time updates */
    realTime: {
      enabled: boolean;
      updateStrategy: 'replace' | 'append' | 'merge';
      bufferSize?: number;
    };
  };
  
  /** Alert and notification settings */
  alerts?: {
    /** Enable widget-level alerts */
    enabled: boolean;
    
    /** Alert conditions */
    conditions: Array<{
      condition: string;
      threshold: number;
      severity: AlertSeverity;
      message: string;
    }>;
    
    /** Visual alert indicators */
    visualIndicators: {
      blinking: boolean;
      colorChange: boolean;
      iconOverlay: boolean;
    };
  };
  
  /** Widget layout and styling */
  layout: {
    /** Position in dashboard grid */
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    
    /** Responsive behavior */
    responsive: {
      minWidth: number;
      minHeight: number;
      breakpoints?: Record<string, {
        width: number;
        height: number;
      }>;
    };
    
    /** Custom styling */
    style?: {
      backgroundColor?: string;
      borderColor?: string;
      borderWidth?: number;
      borderRadius?: number;
      boxShadow?: string;
      padding?: number[];
      margin?: number[];
    };
  };
}

/**
 * Interface for real-time dashboard data management
 * Handles live data streaming and updates for dashboard components
 */
export interface IRealTimeDashboardData {
  /** Data stream identifier */
  streamId: string;
  
  /** Dashboard that owns this data stream */
  dashboardId: string;
  
  /** Stream configuration */
  config: {
    /** Data sources for the stream */
    dataSources: Array<{
      sourceId: string;
      sourceType: 'metrics' | 'alerts' | 'health' | 'predictions' | 'recovery';
      updateFrequency: number; // milliseconds
      priority: number;
    }>;
    
    /** Stream buffer settings */
    buffer: {
      /** Maximum buffer size per data type */
      maxSize: number;
      
      /** Buffer overflow strategy */
      overflowStrategy: 'drop_oldest' | 'drop_newest' | 'compress';
      
      /** Data retention time */
      retentionTime: number; // seconds
    };
    
    /** Quality of service settings */
    qos: {
      /** Delivery guarantee */
      delivery: 'at_most_once' | 'at_least_once' | 'exactly_once';
      
      /** Maximum acceptable latency */
      maxLatency: number; // milliseconds
      
      /** Error handling strategy */
      errorHandling: 'ignore' | 'retry' | 'fallback' | 'alert';
    };
  };
  
  /** Current data state */
  data: {
    /** Latest metrics data */
    metrics: Map<string, Array<{
      timestamp: string;
      value: number;
      metadata?: Record<string, any>;
    }>>;
    
    /** Current health status */
    healthStatus: Map<string, IHealthStatus>;
    
    /** Active alerts */
    alerts: Map<string, IAlert>;
    
    /** Latest predictions */
    predictions: Map<string, IPredictionResult>;
    
    /** Recent recovery executions */
    recoveryExecutions: Map<string, IRecoveryExecution>;
    
    /** System events */
    events: Array<{
      timestamp: string;
      type: string;
      source: string;
      data: Record<string, any>;
    }>;
  };
  
  /** Stream statistics */
  statistics: {
    /** Data throughput */
    throughput: {
      messagesPerSecond: number;
      bytesPerSecond: number;
      peakThroughput: number;
    };
    
    /** Latency metrics */
    latency: {
      average: number;
      p95: number;
      p99: number;
      max: number;
    };
    
    /** Error statistics */
    errors: {
      totalErrors: number;
      errorRate: number;
      lastError?: {
        timestamp: string;
        message: string;
        source: string;
      };
    };
    
    /** Connection health */
    connectionHealth: {
      status: 'connected' | 'disconnected' | 'reconnecting' | 'error';
      lastConnected: string;
      reconnectAttempts: number;
    };
  };
  
  /** Data subscribers (widgets using this stream) */
  subscribers: Array<{
    widgetId: string;
    subscriptionType: 'full' | 'filtered' | 'aggregated';
    filters?: Record<string, any>;
    lastUpdate: string;
    updateCount: number;
  }>;
}

/**
 * Interface for dashboard analytics and insights
 * Provides advanced analytics and insights for dashboard data
 */
export interface IDashboardAnalytics {
  /** Analytics identifier */
  id: string;
  
  /** Dashboard being analyzed */
  dashboardId: string;
  
  /** Analytics configuration */
  config: {
    /** Analysis types to perform */
    analysisTypes: Array<{
      type: 'trend_analysis' | 'anomaly_detection' | 'correlation_analysis' | 'pattern_recognition' | 'forecasting';
      enabled: boolean;
      parameters: Record<string, any>;
    }>;
    
    /** Analysis schedule */
    schedule: {
      /** How often to run analytics */
      frequency: 'real_time' | 'hourly' | 'daily' | 'weekly';
      
      /** Specific times for scheduled analysis */
      scheduledTimes?: string[];
      
      /** Trigger conditions for event-driven analysis */
      triggers?: Array<{
        event: string;
        condition: string;
      }>;
    };
    
    /** Data scope for analysis */
    scope: {
      /** Time range for historical analysis */
      timeRange: string; // e.g., '30d', '7d', '24h'
      
      /** Metrics to include in analysis */
      includeMetrics: MetricType[];
      
      /** Agents to analyze */
      agentIds: string[];
    };
  };
  
  /** Analysis results */
  results: {
    /** Trend analysis results */
    trends: Array<{
      metric: MetricType;
      agentId: string;
      trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
      strength: number; // 0-1
      confidence: number; // 0-1
      timeframe: string;
      projectedOutcome?: string;
    }>;
    
    /** Detected anomalies */
    anomalies: Array<{
      metric: MetricType;
      agentId: string;
      anomalyType: string;
      severity: AlertSeverity;
      confidence: number;
      detectedAt: string;
      description: string;
      impact?: string;
    }>;
    
    /** Correlation findings */
    correlations: Array<{
      metrics: Array<{
        metric: MetricType;
        agentId: string;
      }>;
      correlationCoefficient: number;
      significance: number;
      relationship: 'positive' | 'negative' | 'complex';
      insights: string[];
    }>;
    
    /** Pattern recognition results */
    patterns: Array<{
      patternType: string;
      description: string;
      frequency: number;
      confidence: number;
      affectedComponents: string[];
      businessImpact?: string;
      recommendations?: string[];
    }>;
    
    /** Forecasting results */
    forecasts: Array<{
      metric: MetricType;
      agentId: string;
      forecastHorizon: string;
      predictions: Array<{
        timestamp: string;
        value: number;
        confidence: number;
      }>;
      risks: Array<{
        risk: string;
        probability: number;
        impact: string;
      }>;
    }>;
  };
  
  /** Insight generation */
  insights: {
    /** Automatically generated insights */
    automated: Array<{
      type: 'performance' | 'availability' | 'cost' | 'security' | 'optimization';
      title: string;
      description: string;
      severity: 'info' | 'warning' | 'critical';
      actionable: boolean;
      recommendations?: Array<{
        action: string;
        priority: 'low' | 'medium' | 'high';
        effort: 'low' | 'medium' | 'high';
        impact: string;
      }>;
      confidence: number;
      generatedAt: string;
    }>;
    
    /** Performance optimization suggestions */
    optimizations: Array<{
      component: string;
      currentPerformance: number;
      potentialImprovement: number;
      optimizationActions: string[];
      estimatedEffort: string;
      expectedRoi?: number;
    }>;
    
    /** Capacity planning insights */
    capacityPlanning: Array<{
      resource: string;
      currentUtilization: number;
      projectedUtilization: number;
      timeToCapacity: string;
      recommendations: string[];
    }>;
    
    /** Cost optimization opportunities */
    costOptimization?: Array<{
      area: string;
      currentCost: number;
      potentialSavings: number;
      optimizationMethod: string;
      riskLevel: 'low' | 'medium' | 'high';
    }>;
  };
  
  /** Analytics metadata */
  metadata: {
    /** Last analysis timestamp */
    lastAnalysis: string;
    
    /** Analysis duration */
    analysisDuration: number; // milliseconds
    
    /** Data points analyzed */
    dataPointsAnalyzed: number;
    
    /** Analysis version */
    analysisVersion: string;
    
    /** Quality metrics */
    quality: {
      dataQuality: number; // 0-1
      analysisConfidence: number; // 0-1
      insightRelevance: number; // 0-1
    };
  };
}

/**
 * Interface for dashboard export and reporting
 * Handles dashboard data export and automated report generation
 */
export interface IDashboardExport {
  /** Export job identifier */
  id: string;
  
  /** Export configuration */
  config: {
    /** Dashboard to export */
    dashboardId: string;
    
    /** Export format */
    format: 'pdf' | 'png' | 'jpg' | 'csv' | 'json' | 'excel' | 'html';
    
    /** Export scope */
    scope: {
      /** Widgets to include */
      includeWidgets: string[];
      
      /** Time range for data */
      timeRange: {
        start: string;
        end: string;
      };
      
      /** Data granularity */
      granularity: string; // e.g., '1m', '5m', '1h'
      
      /** Include analytics insights */
      includeInsights: boolean;
    };
    
    /** Export options */
    options: {
      /** Page layout (for PDF/image exports) */
      layout: {
        orientation: 'portrait' | 'landscape';
        pageSize: 'A4' | 'A3' | 'letter' | 'custom';
        margins: [number, number, number, number]; // top, right, bottom, left
      };
      
      /** Image quality (for image exports) */
      imageQuality?: number; // 0-100
      
      /** Include raw data */
      includeRawData: boolean;
      
      /** Data compression */
      compression?: {
        enabled: boolean;
        level: number;
      };
    };
    
    /** Schedule configuration */
    schedule?: {
      /** Recurring export schedule */
      recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
      
      /** Specific schedule times */
      scheduleTimes?: string[];
      
      /** Recipients for scheduled exports */
      recipients?: string[];
      
      /** Delivery method */
      deliveryMethod?: 'email' | 'file_share' | 'api_webhook';
    };
  };
  
  /** Export status */
  status: {
    /** Current status */
    current: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    
    /** Progress percentage */
    progress: number; // 0-100
    
    /** Processing start time */
    startedAt: string;
    
    /** Processing completion time */
    completedAt?: string;
    
    /** Error information */
    error?: {
      code: string;
      message: string;
      details?: Record<string, any>;
    };
  };
  
  /** Export results */
  results?: {
    /** Output file information */
    files: Array<{
      name: string;
      size: number; // bytes
      url: string;
      format: string;
      checksum?: string;
    }>;
    
    /** Export statistics */
    statistics: {
      /** Total data points exported */
      dataPointsExported: number;
      
      /** Number of widgets included */
      widgetsExported: number;
      
      /** Export file size */
      totalSize: number; // bytes
      
      /** Processing time */
      processingTime: number; // milliseconds
    };
    
    /** Quality metrics */
    quality: {
      /** Data completeness */
      dataCompleteness: number; // 0-1
      
      /** Export fidelity */
      exportFidelity: number; // 0-1
      
      /** Visual quality (for image/PDF exports) */
      visualQuality?: number; // 0-1
    };
  };
  
  /** Export metadata */
  metadata: {
    /** Export requested by */
    requestedBy: string;
    
    /** Export purpose */
    purpose?: string;
    
    /** Export tags */
    tags?: string[];
    
    /** Retention policy */
    retention?: {
      deleteAfterDays: number;
      notifyBeforeDeletion: boolean;
    };
  };
}