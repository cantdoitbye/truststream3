/**
 * Statistical Analyzer Implementation
 * Provides comprehensive statistical analysis for A/B testing experiments
 */

import {
  IStatisticalAnalyzer,
  ExperimentMetrics,
  VariantMetrics,
  OverallMetrics,
  Anomaly,
  ExperimentInsights,
  Recommendation,
  PowerAnalysis,
  ValidationResult
} from '../interfaces';

import {
  StatisticalResult,
  VariantComparison,
  MetricValue,
  StatisticalTestType,
  ExperimentMetricType,
  UUID,
  ExperimentationError,
  Experiment,
  ExperimentMetric
} from '../types';

export class StatisticalAnalyzer implements IStatisticalAnalyzer {
  private experiments: Map<UUID, Experiment> = new Map();
  private metricValues: Map<UUID, MetricValue[]> = new Map(); // experimentId -> metric values
  private cachedResults: Map<string, StatisticalResult> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly SIGNIFICANCE_THRESHOLD = 0.05;
  private readonly MINIMUM_SAMPLE_SIZE = 30;

  /**
   * Set experiment configuration
   */
  setExperiment(experiment: Experiment): void {
    this.experiments.set(experiment.id, experiment);
    if (!this.metricValues.has(experiment.id)) {
      this.metricValues.set(experiment.id, []);
    }
  }

  /**
   * Add metric value for analysis
   */
  addMetricValue(metricValue: MetricValue): void {
    const values = this.metricValues.get(metricValue.experimentId) || [];
    values.push(metricValue);
    this.metricValues.set(metricValue.experimentId, values);
    
    // Invalidate cache for this experiment
    this.invalidateCache(metricValue.experimentId);
  }

  /**
   * Calculate statistical significance for an experiment
   */
  async calculateSignificance(experimentId: UUID): Promise<StatisticalResult[]> {
    try {
      const experiment = this.experiments.get(experimentId);
      if (!experiment) {
        throw new Error(`Experiment ${experimentId} not found`);
      }

      const results: StatisticalResult[] = [];

      for (const metric of experiment.metrics) {
        const result = await this.analyzeMetric(experimentId, metric.id);
        results.push(result);
      }

      return results;

    } catch (error) {
      throw new ExperimentationError({
        code: 'SIGNIFICANCE_CALCULATION_ERROR',
        message: `Failed to calculate significance: ${error.message}`,
        timestamp: Date.now(),
        experimentId
      });
    }
  }

  /**
   * Analyze specific metric across variants
   */
  async analyzeMetric(experimentId: UUID, metricId: UUID): Promise<StatisticalResult> {
    try {
      const cacheKey = `${experimentId}:${metricId}`;
      
      // Check cache
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        return cached;
      }

      const experiment = this.experiments.get(experimentId);
      if (!experiment) {
        throw new Error(`Experiment ${experimentId} not found`);
      }

      const metric = experiment.metrics.find(m => m.id === metricId);
      if (!metric) {
        throw new Error(`Metric ${metricId} not found in experiment ${experimentId}`);
      }

      // Get metric values for each variant
      const variantData = this.getVariantMetricData(experimentId, metricId);
      
      if (variantData.length < 2) {
        throw new Error('At least 2 variants with data are required for analysis');
      }

      // Perform statistical test based on metric type
      const result = this.performStatisticalTest(metric, variantData);
      
      // Cache the result
      this.cacheResult(cacheKey, result);
      
      return result;

    } catch (error) {
      throw new ExperimentationError({
        code: 'METRIC_ANALYSIS_ERROR',
        message: `Failed to analyze metric: ${error.message}`,
        timestamp: Date.now(),
        experimentId
      });
    }
  }

  /**
   * Get real-time experiment metrics
   */
  async getExperimentMetrics(experimentId: UUID): Promise<ExperimentMetrics> {
    try {
      const experiment = this.experiments.get(experimentId);
      if (!experiment) {
        throw new Error(`Experiment ${experimentId} not found`);
      }

      const metricValues = this.metricValues.get(experimentId) || [];
      
      // Calculate variant metrics
      const variantMetrics: VariantMetrics[] = experiment.variants.map(variant => {
        const variantValues = metricValues.filter(mv => mv.variantId === variant.id);
        const metrics: Record<string, number> = {};
        const conversionRates: Record<string, number> = {};

        for (const metric of experiment.metrics) {
          const metricData = variantValues.filter(mv => mv.metricId === metric.id);
          
          if (metricData.length > 0) {
            switch (metric.aggregation) {
              case 'sum':
                metrics[metric.name] = metricData.reduce((sum, mv) => sum + mv.value, 0);
                break;
              case 'average':
                metrics[metric.name] = metricData.reduce((sum, mv) => sum + mv.value, 0) / metricData.length;
                break;
              case 'count':
                metrics[metric.name] = metricData.length;
                break;
              case 'rate':
              case 'percentage':
                const conversions = metricData.filter(mv => mv.value > 0).length;
                const rate = metricData.length > 0 ? conversions / metricData.length : 0;
                metrics[metric.name] = rate;
                conversionRates[metric.name] = rate * 100;
                break;
            }
          } else {
            metrics[metric.name] = 0;
            conversionRates[metric.name] = 0;
          }
        }

        return {
          variantId: variant.id,
          sampleSize: variantValues.length,
          metrics,
          conversionRates
        };
      });

      // Calculate overall metrics
      const totalSampleSize = variantMetrics.reduce((sum, vm) => sum + vm.sampleSize, 0);
      const duration = experiment.startDate ? Date.now() - experiment.startDate : 0;

      const overallMetrics: OverallMetrics = {
        totalSampleSize,
        duration,
        confidence: experiment.confidence,
        power: experiment.power
      };

      return {
        experimentId,
        variants: variantMetrics,
        overallMetrics,
        calculatedAt: Date.now()
      };

    } catch (error) {
      throw new ExperimentationError({
        code: 'METRICS_RETRIEVAL_ERROR',
        message: `Failed to get experiment metrics: ${error.message}`,
        timestamp: Date.now(),
        experimentId
      });
    }
  }

  /**
   * Calculate required sample size
   */
  async calculateSampleSize(
    expectedEffect: number,
    confidence: number,
    power: number,
    baselineRate?: number
  ): Promise<number> {
    try {
      // Z-scores for common confidence levels
      const zAlpha = this.getZScore(confidence);
      const zBeta = this.getZScore(power);

      if (baselineRate !== undefined) {
        // For conversion rate tests
        const p1 = baselineRate;
        const p2 = baselineRate * (1 + expectedEffect);
        const pooledP = (p1 + p2) / 2;
        
        const numerator = Math.pow(zAlpha * Math.sqrt(2 * pooledP * (1 - pooledP)) + 
                                  zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2);
        const denominator = Math.pow(p2 - p1, 2);
        
        return Math.ceil(numerator / denominator);
      } else {
        // For continuous metrics (simplified calculation)
        const effectSize = Math.abs(expectedEffect);
        const numerator = Math.pow(zAlpha + zBeta, 2) * 2;
        const denominator = Math.pow(effectSize, 2);
        
        return Math.ceil(numerator / denominator);
      }

    } catch (error) {
      throw new ExperimentationError({
        code: 'SAMPLE_SIZE_CALCULATION_ERROR',
        message: `Failed to calculate sample size: ${error.message}`,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Detect anomalies in experiment data
   */
  async detectAnomalies(experimentId: UUID): Promise<Anomaly[]> {
    try {
      const anomalies: Anomaly[] = [];
      const experiment = this.experiments.get(experimentId);
      if (!experiment) {
        return anomalies;
      }

      const metricValues = this.metricValues.get(experimentId) || [];
      
      // Sample Ratio Mismatch detection
      const srmAnomaly = this.detectSampleRatioMismatch(experiment, metricValues);
      if (srmAnomaly) {
        anomalies.push(srmAnomaly);
      }

      // Outlier detection
      const outlierAnomalies = this.detectOutliers(experiment, metricValues);
      anomalies.push(...outlierAnomalies);

      // Variance increase detection
      const varianceAnomalies = this.detectVarianceIncrease(experiment, metricValues);
      anomalies.push(...varianceAnomalies);

      // Trend change detection
      const trendAnomalies = this.detectTrendChanges(experiment, metricValues);
      anomalies.push(...trendAnomalies);

      return anomalies;

    } catch (error) {
      throw new ExperimentationError({
        code: 'ANOMALY_DETECTION_ERROR',
        message: `Failed to detect anomalies: ${error.message}`,
        timestamp: Date.now(),
        experimentId
      });
    }
  }

  /**
   * Generate experiment insights
   */
  async generateInsights(experimentId: UUID): Promise<ExperimentInsights> {
    try {
      const results = await this.calculateSignificance(experimentId);
      const metrics = await this.getExperimentMetrics(experimentId);
      const anomalies = await this.detectAnomalies(experimentId);

      // Determine winning variant
      let winningVariant: UUID | undefined;
      let maxConfidence = 0;

      for (const result of results) {
        if (result.significance > maxConfidence && result.pValue < this.SIGNIFICANCE_THRESHOLD) {
          maxConfidence = result.significance;
          // Find the best performing variant
          const bestVariant = result.variantComparison.reduce((best, current) => 
            current.mean > best.mean ? current : best
          );
          winningVariant = bestVariant.variantId;
        }
      }

      // Generate recommendations
      const recommendations = this.generateRecommendations(results, metrics, anomalies);

      // Key findings
      const keyFindings = this.generateKeyFindings(results, metrics);

      // Next steps
      const nextSteps = this.generateNextSteps(results, metrics, anomalies);

      return {
        experimentId,
        winningVariant,
        confidence: maxConfidence,
        recommendations,
        keyFindings,
        nextSteps
      };

    } catch (error) {
      throw new ExperimentationError({
        code: 'INSIGHTS_GENERATION_ERROR',
        message: `Failed to generate insights: ${error.message}`,
        timestamp: Date.now(),
        experimentId
      });
    }
  }

  /**
   * Validate metric definitions
   */
  validateMetrics(metrics: ExperimentMetric[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      if (!metrics || metrics.length === 0) {
        errors.push('At least one metric is required');
        return { valid: false, errors, warnings };
      }

      const primaryMetrics = metrics.filter(m => m.type === ExperimentMetricType.PRIMARY);
      if (primaryMetrics.length === 0) {
        errors.push('At least one primary metric is required');
      }

      if (primaryMetrics.length > 3) {
        warnings.push('Having more than 3 primary metrics may affect statistical power');
      }

      for (const metric of metrics) {
        if (!metric.name || metric.name.trim().length === 0) {
          errors.push('Metric name is required');
        }

        if (!metric.statisticalTest) {
          errors.push(`Statistical test is required for metric ${metric.name}`);
        }

        if (metric.type === ExperimentMetricType.GUARDRAIL && !metric.guardrailThresholds) {
          warnings.push(`Guardrail thresholds recommended for guardrail metric ${metric.name}`);
        }
      }

    } catch (error) {
      errors.push(`Metric validation error: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Calculate power analysis
   */
  async calculatePowerAnalysis(experimentId: UUID): Promise<PowerAnalysis> {
    try {
      const experiment = this.experiments.get(experimentId);
      if (!experiment) {
        throw new Error(`Experiment ${experimentId} not found`);
      }

      const metrics = await this.getExperimentMetrics(experimentId);
      const currentSampleSize = metrics.overallMetrics.totalSampleSize;

      // Calculate current statistical power (simplified)
      const currentPower = this.calculateCurrentPower(experiment, currentSampleSize);
      
      // Calculate required sample size for desired power
      const requiredSampleSize = await this.calculateSampleSize(0.05, experiment.confidence, experiment.power);

      // Estimate time to significance based on current traffic
      let timeToSignificance: number | undefined;
      if (currentSampleSize > 0 && experiment.startDate) {
        const dailyTraffic = currentSampleSize / ((Date.now() - experiment.startDate) / (1000 * 60 * 60 * 24));
        if (dailyTraffic > 0) {
          const remainingSamples = Math.max(0, requiredSampleSize - currentSampleSize);
          timeToSignificance = remainingSamples / dailyTraffic;
        }
      }

      const recommendations: string[] = [];
      
      if (currentPower < experiment.power) {
        recommendations.push(`Current power (${(currentPower * 100).toFixed(1)}%) is below target (${(experiment.power * 100).toFixed(1)}%)`);
        recommendations.push(`Need ${requiredSampleSize - currentSampleSize} more samples`);
      }

      if (timeToSignificance && timeToSignificance > 30) {
        recommendations.push('Consider increasing traffic allocation or reducing required effect size');
      }

      return {
        experimentId,
        currentPower,
        requiredSampleSize,
        timeToSignificance,
        recommendations
      };

    } catch (error) {
      throw new ExperimentationError({
        code: 'POWER_ANALYSIS_ERROR',
        message: `Failed to calculate power analysis: ${error.message}`,
        timestamp: Date.now(),
        experimentId
      });
    }
  }

  /**
   * Private helper methods
   */

  private getVariantMetricData(experimentId: UUID, metricId: UUID): VariantComparison[] {
    const metricValues = this.metricValues.get(experimentId) || [];
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return [];

    return experiment.variants.map(variant => {
      const variantValues = metricValues.filter(mv => 
        mv.variantId === variant.id && mv.metricId === metricId
      );

      const values = variantValues.map(mv => mv.value);
      const mean = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
      const variance = values.length > 1 ? this.calculateVariance(values, mean) : 0;
      const conversionRate = values.filter(v => v > 0).length / Math.max(values.length, 1);

      return {
        variantId: variant.id,
        mean,
        variance,
        sampleSize: values.length,
        conversionRate
      };
    });
  }

  private performStatisticalTest(metric: ExperimentMetric, variantData: VariantComparison[]): StatisticalResult {
    const controlVariant = variantData[0]; // Assume first variant is control
    const treatmentVariants = variantData.slice(1);

    // For simplicity, we'll perform t-test comparison
    const comparison = treatmentVariants[0] || controlVariant;
    
    const { pValue, significance } = this.performTTest(controlVariant, comparison);
    const effectSize = this.calculateEffectSize(controlVariant, comparison);
    const confidenceInterval = this.calculateConfidenceInterval(controlVariant, comparison);

    return {
      metricId: metric.id,
      variantComparison: variantData,
      significance,
      pValue,
      confidenceInterval,
      effectSize,
      sampleSize: variantData.reduce((sum, v) => sum + v.sampleSize, 0),
      testType: metric.statisticalTest,
      calculatedAt: Date.now()
    };
  }

  private performTTest(control: VariantComparison, treatment: VariantComparison): { pValue: number; significance: number } {
    if (control.sampleSize < this.MINIMUM_SAMPLE_SIZE || treatment.sampleSize < this.MINIMUM_SAMPLE_SIZE) {
      return { pValue: 1, significance: 0 };
    }

    // Simplified t-test calculation
    const pooledStdError = Math.sqrt(
      (control.variance / control.sampleSize) + (treatment.variance / treatment.sampleSize)
    );

    const tStatistic = Math.abs(treatment.mean - control.mean) / pooledStdError;
    const degreesOfFreedom = control.sampleSize + treatment.sampleSize - 2;

    // Simplified p-value calculation (in reality, would use proper statistical distribution)
    const pValue = Math.max(0.001, 2 * (1 - this.normalCDF(tStatistic)));
    const significance = 1 - pValue;

    return { pValue, significance };
  }

  private calculateEffectSize(control: VariantComparison, treatment: VariantComparison): number {
    const pooledStd = Math.sqrt((control.variance + treatment.variance) / 2);
    return pooledStd > 0 ? (treatment.mean - control.mean) / pooledStd : 0;
  }

  private calculateConfidenceInterval(control: VariantComparison, treatment: VariantComparison): [number, number] {
    const diff = treatment.mean - control.mean;
    const standardError = Math.sqrt(
      (control.variance / control.sampleSize) + (treatment.variance / treatment.sampleSize)
    );
    const margin = 1.96 * standardError; // 95% confidence interval

    return [diff - margin, diff + margin];
  }

  private calculateVariance(values: number[], mean: number): number {
    if (values.length <= 1) return 0;
    const sumSquaredDiffs = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0);
    return sumSquaredDiffs / (values.length - 1);
  }

  private normalCDF(x: number): number {
    // Simplified normal cumulative distribution function
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  private erf(x: number): number {
    // Simplified error function approximation
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  private getZScore(probability: number): number {
    // Simplified Z-score calculation for common probabilities
    const zScores: Record<string, number> = {
      '0.80': 0.84,
      '0.85': 1.04,
      '0.90': 1.28,
      '0.95': 1.65,
      '0.975': 1.96,
      '0.99': 2.33,
      '0.995': 2.58
    };

    const key = probability.toFixed(3);
    return zScores[key] || 1.96; // Default to 95% confidence
  }

  private detectSampleRatioMismatch(experiment: Experiment, metricValues: MetricValue[]): Anomaly | null {
    const variantCounts = new Map<UUID, number>();
    
    metricValues.forEach(mv => {
      variantCounts.set(mv.variantId, (variantCounts.get(mv.variantId) || 0) + 1);
    });

    const totalSamples = Array.from(variantCounts.values()).reduce((sum, count) => sum + count, 0);
    if (totalSamples === 0) return null;

    for (const variant of experiment.variants) {
      const actualCount = variantCounts.get(variant.id) || 0;
      const expectedCount = (variant.allocation / 100) * totalSamples;
      const deviation = Math.abs(actualCount - expectedCount) / expectedCount;

      if (deviation > 0.1) { // 10% deviation threshold
        return {
          type: 'sample_ratio_mismatch',
          severity: deviation > 0.2 ? 'critical' : 'high',
          description: `Sample ratio mismatch detected for variant ${variant.id}`,
          affectedVariants: [variant.id],
          detectedAt: Date.now(),
          recommendations: ['Check traffic splitting configuration', 'Verify experiment assignment logic']
        };
      }
    }

    return null;
  }

  private detectOutliers(experiment: Experiment, metricValues: MetricValue[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    for (const metric of experiment.metrics) {
      const values = metricValues
        .filter(mv => mv.metricId === metric.id)
        .map(mv => mv.value);

      if (values.length < 10) continue; // Need sufficient data

      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const std = Math.sqrt(this.calculateVariance(values, mean));
      const outlierThreshold = 3 * std; // 3-sigma rule

      const outliers = values.filter(v => Math.abs(v - mean) > outlierThreshold);
      
      if (outliers.length > values.length * 0.05) { // More than 5% outliers
        anomalies.push({
          type: 'outlier',
          severity: 'medium',
          description: `High number of outliers detected in metric ${metric.name}`,
          affectedVariants: experiment.variants.map(v => v.id),
          detectedAt: Date.now(),
          recommendations: ['Investigate data collection process', 'Consider outlier filtering']
        });
      }
    }

    return anomalies;
  }

  private detectVarianceIncrease(experiment: Experiment, metricValues: MetricValue[]): Anomaly[] {
    // Simplified variance increase detection
    // In a real implementation, this would track variance over time
    return [];
  }

  private detectTrendChanges(experiment: Experiment, metricValues: MetricValue[]): Anomaly[] {
    // Simplified trend change detection
    // In a real implementation, this would analyze time series data
    return [];
  }

  private generateRecommendations(
    results: StatisticalResult[],
    metrics: ExperimentMetrics,
    anomalies: Anomaly[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Check for significant results
    const significantResults = results.filter(r => r.pValue < this.SIGNIFICANCE_THRESHOLD);
    
    if (significantResults.length > 0) {
      recommendations.push({
        type: 'stop',
        priority: 'high',
        description: 'Significant results detected - consider stopping experiment',
        reasoning: 'Statistical significance achieved for primary metrics'
      });
    } else if (metrics.overallMetrics.totalSampleSize < 1000) {
      recommendations.push({
        type: 'continue',
        priority: 'medium',
        description: 'Continue experiment to reach sufficient sample size',
        reasoning: 'Current sample size may be insufficient for reliable results'
      });
    }

    // Check for anomalies
    if (anomalies.some(a => a.severity === 'critical')) {
      recommendations.push({
        type: 'investigate',
        priority: 'high',
        description: 'Critical anomalies detected - investigate immediately',
        reasoning: 'Data quality issues may affect experiment validity'
      });
    }

    return recommendations;
  }

  private generateKeyFindings(results: StatisticalResult[], metrics: ExperimentMetrics): string[] {
    const findings: string[] = [];

    const significantResults = results.filter(r => r.pValue < this.SIGNIFICANCE_THRESHOLD);
    findings.push(`${significantResults.length} out of ${results.length} metrics show statistical significance`);

    const totalSamples = metrics.overallMetrics.totalSampleSize;
    findings.push(`Total sample size: ${totalSamples} users`);

    const duration = Math.round(metrics.overallMetrics.duration / (1000 * 60 * 60 * 24));
    findings.push(`Experiment duration: ${duration} days`);

    return findings;
  }

  private generateNextSteps(
    results: StatisticalResult[],
    metrics: ExperimentMetrics,
    anomalies: Anomaly[]
  ): string[] {
    const nextSteps: string[] = [];

    if (anomalies.length > 0) {
      nextSteps.push('Address detected anomalies before proceeding');
    }

    if (results.some(r => r.pValue < this.SIGNIFICANCE_THRESHOLD)) {
      nextSteps.push('Prepare for experiment conclusion and rollout');
    } else {
      nextSteps.push('Continue data collection');
      nextSteps.push('Monitor for early stopping criteria');
    }

    return nextSteps;
  }

  private calculateCurrentPower(experiment: Experiment, sampleSize: number): number {
    // Simplified power calculation
    // In reality, this would depend on effect size and variance
    const minSampleSize = experiment.minimumSampleSize;
    return Math.min(0.95, sampleSize / minSampleSize * experiment.power);
  }

  private getCachedResult(key: string): StatisticalResult | null {
    const expiry = this.cacheExpiry.get(key);
    if (expiry && Date.now() < expiry) {
      return this.cachedResults.get(key) || null;
    }
    return null;
  }

  private cacheResult(key: string, result: StatisticalResult): void {
    this.cachedResults.set(key, result);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
  }

  private invalidateCache(experimentId: UUID): void {
    const keysToDelete: string[] = [];
    for (const key of this.cachedResults.keys()) {
      if (key.startsWith(experimentId)) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.cachedResults.delete(key);
      this.cacheExpiry.delete(key);
    }
  }
}

export default StatisticalAnalyzer;