/**
 * @fileoverview Predictive analytics interfaces for governance agents performance forecasting
 * @version 1.0.0
 * @author TrustStream Health Monitoring System
 * @description Advanced interfaces for machine learning-powered performance prediction,
 * anomaly detection, and proactive health management in the governance agent ecosystem.
 */

import { IMetric, MetricType, AlertSeverity, HealthLevel } from './health.interfaces';

/**
 * Enumeration of prediction model types
 */
export enum PredictionModelType {
  LINEAR_REGRESSION = 'linear_regression',
  POLYNOMIAL_REGRESSION = 'polynomial_regression',
  TIME_SERIES_ARIMA = 'time_series_arima',
  LSTM_NEURAL_NETWORK = 'lstm_neural_network',
  RANDOM_FOREST = 'random_forest',
  GRADIENT_BOOSTING = 'gradient_boosting',
  SEASONAL_DECOMPOSITION = 'seasonal_decomposition',
  EXPONENTIAL_SMOOTHING = 'exponential_smoothing',
  PROPHET = 'prophet',
  ENSEMBLE = 'ensemble'
}

/**
 * Enumeration of anomaly detection algorithms
 */
export enum AnomalyDetectionAlgorithm {
  ISOLATION_FOREST = 'isolation_forest',
  ONE_CLASS_SVM = 'one_class_svm',
  LOCAL_OUTLIER_FACTOR = 'local_outlier_factor',
  DBSCAN = 'dbscan',
  STATISTICAL_OUTLIER = 'statistical_outlier',
  SEASONAL_HYBRID_ESD = 'seasonal_hybrid_esd',
  AUTOENCODER = 'autoencoder',
  LSTM_AUTOENCODER = 'lstm_autoencoder',
  CHANGEPOINT_DETECTION = 'changepoint_detection'
}

/**
 * Interface for predictive model configuration
 * Defines parameters and settings for various prediction algorithms
 */
export interface IPredictiveModelConfig {
  /** Unique identifier for the model configuration */
  id: string;
  
  /** Name of the prediction model */
  name: string;
  
  /** Type of prediction model */
  modelType: PredictionModelType;
  
  /** Metric types this model can predict */
  supportedMetrics: MetricType[];
  
  /** Model parameters specific to the algorithm */
  parameters: {
    /** Training parameters */
    training: {
      /** Historical data window for training (hours) */
      trainingWindowHours: number;
      
      /** Minimum number of data points required for training */
      minDataPoints: number;
      
      /** Features to use for prediction */
      features: Array<{
        name: string;
        type: 'metric' | 'derived' | 'external';
        source: string;
        transformation?: 'log' | 'sqrt' | 'normalize' | 'standardize';
      }>;
      
      /** Model hyperparameters */
      hyperparameters: Record<string, any>;
      
      /** Cross-validation settings */
      crossValidation: {
        enabled: boolean;
        folds: number;
        method: 'time_series' | 'random' | 'stratified';
      };
    };
    
    /** Prediction parameters */
    prediction: {
      /** Forecast horizon (hours) */
      forecastHours: number;
      
      /** Prediction interval (minutes) */
      predictionInterval: number;
      
      /** Confidence levels to calculate */
      confidenceLevels: number[];
      
      /** Whether to include prediction intervals */
      includePredictionIntervals: boolean;
    };
    
    /** Model update settings */
    updates: {
      /** How often to retrain the model (hours) */
      retrainIntervalHours: number;
      
      /** Trigger retraining when performance degrades */
      performanceThreshold: number;
      
      /** Whether to use online learning */
      onlineLearning: boolean;
      
      /** Incremental update settings */
      incremental: {
        enabled: boolean;
        batchSize: number;
        learningRate: number;
      };
    };
  };
  
  /** Model performance metrics */
  performance: {
    /** Mean Absolute Error */
    mae: number;
    
    /** Root Mean Square Error */
    rmse: number;
    
    /** Mean Absolute Percentage Error */
    mape: number;
    
    /** R-squared score */
    r2Score: number;
    
    /** Prediction accuracy by time horizon */
    accuracyByHorizon: Record<number, number>;
    
    /** Last evaluation timestamp */
    lastEvaluated: string;
  };
  
  /** Model metadata */
  metadata: {
    /** When the model was created */
    createdAt: string;
    
    /** Last training timestamp */
    lastTrained: string;
    
    /** Model version */
    version: string;
    
    /** Training data statistics */
    trainingStats: {
      totalSamples: number;
      featureCount: number;
      trainingDuration: number;
    };
    
    /** Additional model-specific metadata */
    custom?: Record<string, any>;
  };
  
  /** Whether this model is currently active */
  enabled: boolean;
}

/**
 * Interface for prediction results and forecasts
 * Contains the output of predictive models with confidence metrics
 */
export interface IPredictionResult {
  /** Unique identifier for the prediction */
  id: string;
  
  /** Model used for this prediction */
  modelId: string;
  
  /** Agent ID the prediction is for */
  agentId: string;
  
  /** Metric type being predicted */
  metricType: MetricType;
  
  /** When the prediction was generated */
  generatedAt: string;
  
  /** Base timestamp for the forecast */
  baseTimestamp: string;
  
  /** Predicted values with timestamps */
  forecast: Array<{
    /** Future timestamp */
    timestamp: string;
    
    /** Predicted value */
    value: number;
    
    /** Confidence in this prediction (0-1) */
    confidence: number;
    
    /** Prediction intervals */
    intervals: Array<{
      level: number; // confidence level (e.g., 0.95 for 95%)
      lower: number;
      upper: number;
    }>;
    
    /** Contributing factors to this prediction */
    factors?: Array<{
      factor: string;
      impact: number; // -1 to 1, negative means decreasing impact
      importance: number; // 0-1, how important this factor is
    }>;
  }>;
  
  /** Overall prediction quality metrics */
  quality: {
    /** Overall confidence score */
    overallConfidence: number;
    
    /** Prediction stability (how much predictions change over time) */
    stability: number;
    
    /** Model agreement (if using ensemble) */
    modelAgreement?: number;
    
    /** Data quality score for input data */
    dataQuality: number;
  };
  
  /** Prediction trends and patterns */
  trends: {
    /** Overall trend direction */
    direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    
    /** Trend strength (0-1) */
    strength: number;
    
    /** Seasonal patterns detected */
    seasonality?: Array<{
      period: number; // in hours
      amplitude: number;
      phase: number;
    }>;
    
    /** Trend change points */
    changePoints?: Array<{
      timestamp: string;
      type: 'level' | 'trend' | 'seasonal';
      magnitude: number;
    }>;
  };
  
  /** Risk assessment based on predictions */
  risks: Array<{
    /** Type of risk identified */
    type: 'threshold_breach' | 'performance_degradation' | 'resource_exhaustion' | 'anomaly';
    
    /** Risk severity */
    severity: AlertSeverity;
    
    /** Probability of risk occurring (0-1) */
    probability: number;
    
    /** Expected time to risk event */
    timeToEvent?: string;
    
    /** Risk description */
    description: string;
    
    /** Recommended actions */
    recommendations?: string[];
  }>;
  
  /** Historical comparison */
  comparison?: {
    /** Similar periods from historical data */
    historicalPeriods: Array<{
      startDate: string;
      endDate: string;
      similarity: number; // 0-1
      outcome: 'similar' | 'better' | 'worse';
    }>;
    
    /** Comparison with previous predictions */
    previousPredictions: Array<{
      predictionId: string;
      actualVsPredicted: number; // accuracy ratio
      deviation: number;
    }>;
  };
}

/**
 * Interface for anomaly detection configuration and results
 * Handles real-time anomaly detection and classification
 */
export interface IAnomalyDetection {
  /** Configuration for anomaly detection */
  config: {
    /** Anomaly detection algorithms to use */
    algorithms: Array<{
      name: AnomalyDetectionAlgorithm;
      weight: number; // for ensemble methods
      parameters: Record<string, any>;
      enabled: boolean;
    }>;
    
    /** Sensitivity settings */
    sensitivity: {
      /** Global sensitivity level */
      global: 'low' | 'medium' | 'high' | 'custom';
      
      /** Metric-specific sensitivity overrides */
      perMetric: Record<MetricType, number>;
      
      /** Time-based sensitivity (e.g., higher sensitivity during business hours) */
      temporal: Array<{
        timeRange: string; // e.g., "09:00-17:00"
        daysOfWeek: string[];
        sensitivityMultiplier: number;
      }>;
    };
    
    /** Anomaly classification */
    classification: {
      /** Minimum score to consider as anomaly */
      anomalyThreshold: number;
      
      /** Severity thresholds */
      severityThresholds: {
        low: number;
        medium: number;
        high: number;
        critical: number;
      };
      
      /** Anomaly types to detect */
      detectionTypes: Array<'point' | 'contextual' | 'collective' | 'seasonal'>;
    };
    
    /** Training and adaptation */
    training: {
      /** Historical data window for training (days) */
      trainingDays: number;
      
      /** Retraining frequency (hours) */
      retrainFrequency: number;
      
      /** Adaptive learning settings */
      adaptive: {
        enabled: boolean;
        learningRate: number;
        forgettingFactor: number;
      };
    };
  };
  
  /** Detected anomalies */
  anomalies: Array<{
    /** Unique anomaly identifier */
    id: string;
    
    /** When the anomaly was detected */
    detectedAt: string;
    
    /** Agent and metric information */
    agentId: string;
    metricType: MetricType;
    
    /** Anomaly details */
    details: {
      /** Anomaly type */
      type: 'spike' | 'drop' | 'plateau' | 'oscillation' | 'trend_change' | 'missing_data';
      
      /** Severity level */
      severity: AlertSeverity;
      
      /** Anomaly score (0-1) */
      score: number;
      
      /** Confidence in detection */
      confidence: number;
      
      /** Duration of the anomaly */
      duration?: number; // seconds
    };
    
    /** Statistical information */
    statistics: {
      /** Observed value */
      observedValue: number;
      
      /** Expected value range */
      expectedRange: {
        lower: number;
        upper: number;
      };
      
      /** Standard deviation from normal */
      standardDeviations: number;
      
      /** Percentile of the observed value */
      percentile: number;
    };
    
    /** Context and patterns */
    context: {
      /** Recent trend before anomaly */
      recentTrend: 'increasing' | 'decreasing' | 'stable';
      
      /** Seasonal context if applicable */
      seasonalContext?: {
        expectedSeasonal: number;
        seasonalDeviation: number;
      };
      
      /** Related metrics that might explain the anomaly */
      correlatedMetrics?: Array<{
        metricType: MetricType;
        correlation: number;
        anomalyStatus: 'normal' | 'anomalous';
      }>;
    };
    
    /** Potential causes and explanations */
    analysis: {
      /** Likely root causes */
      potentialCauses: Array<{
        cause: string;
        likelihood: number; // 0-1
        category: 'system' | 'external' | 'configuration' | 'load' | 'unknown';
      }>;
      
      /** Impact assessment */
      impact: {
        /** Affected components */
        affectedComponents: string[];
        
        /** Business impact level */
        businessImpact: 'low' | 'medium' | 'high' | 'critical';
        
        /** Potential consequences */
        consequences: string[];
      };
      
      /** Recommended actions */
      recommendations: Array<{
        action: string;
        priority: 'low' | 'medium' | 'high';
        timeframe: 'immediate' | 'short_term' | 'long_term';
        effort: 'low' | 'medium' | 'high';
      }>;
    };
    
    /** Resolution tracking */
    resolution?: {
      /** Resolution status */
      status: 'open' | 'investigating' | 'resolved' | 'false_positive';
      
      /** Resolution details */
      resolvedAt?: string;
      resolvedBy?: string;
      resolutionNotes?: string;
      
      /** Actions taken */
      actionsTaken?: Array<{
        action: string;
        takenAt: string;
        takenBy: string;
        result: string;
      }>;
    };
  }>;
  
  /** Detection performance metrics */
  performance: {
    /** Detection accuracy metrics */
    accuracy: {
      /** True positive rate */
      truePositiveRate: number;
      
      /** False positive rate */
      falsePositiveRate: number;
      
      /** Precision */
      precision: number;
      
      /** Recall */
      recall: number;
      
      /** F1 score */
      f1Score: number;
    };
    
    /** Response time metrics */
    responseTimes: {
      /** Average detection time */
      averageDetectionTime: number;
      
      /** Detection latency distribution */
      latencyPercentiles: Record<string, number>;
    };
    
    /** Algorithm performance comparison */
    algorithmPerformance: Record<AnomalyDetectionAlgorithm, {
      accuracy: number;
      latency: number;
      resourceUsage: number;
    }>;
  };
}

/**
 * Interface for performance forecasting engine
 * Combines multiple models and techniques for comprehensive performance prediction
 */
export interface IPerformanceForecastingEngine {
  /** Engine identifier */
  id: string;
  
  /** Engine configuration */
  config: {
    /** Forecasting models to use */
    models: string[]; // Model IDs
    
    /** Ensemble configuration */
    ensemble: {
      /** How to combine model predictions */
      method: 'weighted_average' | 'stacking' | 'voting' | 'best_performer';
      
      /** Model weights (for weighted methods) */
      weights?: Record<string, number>;
      
      /** Meta-learner configuration (for stacking) */
      metaLearner?: {
        algorithm: string;
        parameters: Record<string, any>;
      };
    };
    
    /** Forecasting scope */
    scope: {
      /** Agents to forecast for */
      agentIds: string[];
      
      /** Metrics to forecast */
      metricTypes: MetricType[];
      
      /** Forecast horizons (hours) */
      horizons: number[];
      
      /** Update frequency (minutes) */
      updateFrequency: number;
    };
    
    /** Quality assurance */
    qualityAssurance: {
      /** Minimum confidence threshold for publishing forecasts */
      minConfidence: number;
      
      /** Maximum acceptable forecast error */
      maxAllowableError: number;
      
      /** Forecast validation methods */
      validation: string[];
    };
  };
  
  /** Current forecasting status */
  status: {
    /** Engine operational status */
    operational: 'active' | 'idle' | 'training' | 'error';
    
    /** Last forecast generation time */
    lastForecast: string;
    
    /** Next scheduled forecast */
    nextForecast: string;
    
    /** Active forecast jobs */
    activeJobs: Array<{
      jobId: string;
      agentId: string;
      metricType: MetricType;
      status: 'running' | 'completed' | 'failed';
      progress: number;
    }>;
  };
  
  /** Engine performance metrics */
  performance: {
    /** Forecast accuracy over time */
    accuracy: {
      /** Overall accuracy score */
      overall: number;
      
      /** Accuracy by forecast horizon */
      byHorizon: Record<number, number>;
      
      /** Accuracy by metric type */
      byMetric: Record<MetricType, number>;
      
      /** Accuracy trend over time */
      trend: 'improving' | 'stable' | 'declining';
    };
    
    /** Processing performance */
    processing: {
      /** Average forecast generation time */
      averageGenerationTime: number;
      
      /** Throughput (forecasts per hour) */
      throughput: number;
      
      /** Resource utilization */
      resourceUtilization: {
        cpu: number;
        memory: number;
        storage: number;
      };
    };
    
    /** Model ensemble performance */
    ensemble: {
      /** Individual model contributions */
      modelContributions: Record<string, number>;
      
      /** Ensemble improvement over best individual model */
      ensembleGain: number;
      
      /** Model agreement statistics */
      modelAgreement: {
        average: number;
        standardDeviation: number;
      };
    };
  };
  
  /** Generated forecasts cache */
  forecasts: Record<string, IPredictionResult>;
  
  /** Historical forecast performance */
  history: {
    /** Performance tracking over time */
    performanceHistory: Array<{
      date: string;
      accuracy: number;
      errorRate: number;
      forecastsGenerated: number;
    }>;
    
    /** Notable events and changes */
    events: Array<{
      timestamp: string;
      type: 'model_update' | 'config_change' | 'performance_issue' | 'improvement';
      description: string;
      impact: string;
    }>;
  };
}