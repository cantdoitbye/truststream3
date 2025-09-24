/**
 * TrustStram v4.4 Metrics Collector
 * Collects and analyzes federated learning performance metrics
 */

import { EventEmitter } from 'events';
import {
  FederatedLearningMetrics,
  SystemPerformanceMetrics,
  TrainingMetrics,
  AggregationResult
} from '../types';

/**
 * Comprehensive metrics collection and analysis for federated learning
 */
export class MetricsCollector extends EventEmitter {
  private jobMetrics: Map<string, JobMetrics> = new Map();
  private systemMetrics: SystemMetrics;
  private metricsHistory: MetricsHistory[] = [];
  private collectionInterval: NodeJS.Timeout;
  private readonly COLLECTION_INTERVAL = 10000; // 10 seconds
  private readonly MAX_HISTORY_SIZE = 1000;

  constructor() {
    super();
    this.systemMetrics = this.initializeSystemMetrics();
  }

  /**
   * Initialize metrics collector
   */
  async initialize(): Promise<void> {
    try {
      this.startPeriodicCollection();
      console.log('Metrics Collector initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Metrics Collector:', error);
      throw error;
    }
  }

  /**
   * Record training metrics for a job and round
   */
  recordTrainingMetrics(
    jobId: string,
    roundNumber: number,
    metrics: FederatedLearningMetrics
  ): void {
    try {
      let jobMetrics = this.jobMetrics.get(jobId);
      if (!jobMetrics) {
        jobMetrics = this.initializeJobMetrics(jobId);
        this.jobMetrics.set(jobId, jobMetrics);
      }
      
      // Store round metrics
      jobMetrics.round_metrics.set(roundNumber, {
        ...metrics,
        recorded_at: new Date().toISOString()
      });
      
      // Update job-level aggregates
      this.updateJobAggregates(jobMetrics, metrics);
      
      // Update system-level metrics
      this.updateSystemMetrics(metrics);
      
      this.emit('metrics_recorded', {
        job_id: jobId,
        round_number: roundNumber,
        metrics
      });
      
    } catch (error) {
      console.error(`Failed to record metrics for job ${jobId}:`, error);
    }
  }

  /**
   * Record aggregation result metrics
   */
  recordAggregationMetrics(
    jobId: string,
    roundNumber: number,
    aggregationResult: AggregationResult
  ): void {
    try {
      const jobMetrics = this.jobMetrics.get(jobId);
      if (!jobMetrics) {
        console.warn(`Job metrics not found for ${jobId}`);
        return;
      }
      
      // Record aggregation-specific metrics
      jobMetrics.aggregation_metrics.set(roundNumber, {
        participating_clients: aggregationResult.participating_clients.length,
        byzantine_clients_detected: aggregationResult.byzantine_clients_detected.length,
        aggregation_quality_score: aggregationResult.aggregation_quality.quality_score,
        consensus_score: aggregationResult.aggregation_quality.consensus_score,
        convergence_rate: aggregationResult.convergence_metrics.convergence_rate,
        parameter_stability: aggregationResult.convergence_metrics.parameter_stability,
        recorded_at: new Date().toISOString()
      });
      
      // Update convergence tracking
      this.updateConvergenceTracking(jobMetrics, aggregationResult);
      
    } catch (error) {
      console.error(`Failed to record aggregation metrics for job ${jobId}:`, error);
    }
  }

  /**
   * Record client performance metrics
   */
  recordClientMetrics(
    clientId: string,
    jobId: string,
    roundNumber: number,
    clientMetrics: ClientRoundMetrics
  ): void {
    try {
      const jobMetrics = this.jobMetrics.get(jobId);
      if (!jobMetrics) {
        console.warn(`Job metrics not found for ${jobId}`);
        return;
      }
      
      if (!jobMetrics.client_metrics.has(clientId)) {
        jobMetrics.client_metrics.set(clientId, new Map());
      }
      
      jobMetrics.client_metrics.get(clientId)!.set(roundNumber, {
        ...clientMetrics,
        recorded_at: new Date().toISOString()
      });
      
      // Update client performance statistics
      this.updateClientPerformanceStats(jobMetrics, clientId, clientMetrics);
      
    } catch (error) {
      console.error(`Failed to record client metrics for ${clientId}:`, error);
    }
  }

  /**
   * Record security event metrics
   */
  recordSecurityMetrics(
    jobId: string,
    securityEvent: SecurityEventMetrics
  ): void {
    try {
      const jobMetrics = this.jobMetrics.get(jobId);
      if (!jobMetrics) {
        console.warn(`Job metrics not found for ${jobId}`);
        return;
      }
      
      jobMetrics.security_events.push({
        ...securityEvent,
        recorded_at: new Date().toISOString()
      });
      
      // Update security statistics
      this.updateSecurityStats(jobMetrics, securityEvent);
      
    } catch (error) {
      console.error(`Failed to record security metrics for job ${jobId}:`, error);
    }
  }

  /**
   * Record privacy budget usage
   */
  recordPrivacyMetrics(
    jobId: string,
    roundNumber: number,
    privacyMetrics: PrivacyBudgetMetrics
  ): void {
    try {
      const jobMetrics = this.jobMetrics.get(jobId);
      if (!jobMetrics) {
        console.warn(`Job metrics not found for ${jobId}`);
        return;
      }
      
      jobMetrics.privacy_budget.set(roundNumber, {
        ...privacyMetrics,
        recorded_at: new Date().toISOString()
      });
      
      // Update privacy budget tracking
      this.updatePrivacyBudgetTracking(jobMetrics, privacyMetrics);
      
    } catch (error) {
      console.error(`Failed to record privacy metrics for job ${jobId}:`, error);
    }
  }

  /**
   * Get comprehensive job metrics
   */
  getJobMetrics(jobId: string): JobMetricsReport | null {
    const jobMetrics = this.jobMetrics.get(jobId);
    if (!jobMetrics) {
      return null;
    }
    
    return this.generateJobReport(jobMetrics);
  }

  /**
   * Get system-wide metrics
   */
  getSystemMetrics(): SystemPerformanceMetrics {
    const activeJobs = this.jobMetrics.size;
    const totalRounds = Array.from(this.jobMetrics.values())
      .reduce((sum, job) => sum + job.round_metrics.size, 0);
    
    const averageRoundTime = this.calculateAverageRoundTime();
    const systemThroughput = this.calculateSystemThroughput();
    
    return {
      active_jobs: activeJobs,
      total_clients: this.systemMetrics.total_clients,
      active_clients: this.systemMetrics.active_clients,
      average_round_time: averageRoundTime,
      system_throughput: systemThroughput,
      resource_utilization: this.systemMetrics.resource_utilization,
      security_alerts: this.systemMetrics.security_alerts,
      privacy_violations: this.systemMetrics.privacy_violations
    };
  }

  /**
   * Get performance analytics
   */
  getPerformanceAnalytics(jobId?: string): PerformanceAnalytics {
    if (jobId) {
      return this.generateJobAnalytics(jobId);
    } else {
      return this.generateSystemAnalytics();
    }
  }

  /**
   * Get convergence analysis
   */
  getConvergenceAnalysis(jobId: string): ConvergenceAnalysis | null {
    const jobMetrics = this.jobMetrics.get(jobId);
    if (!jobMetrics) {
      return null;
    }
    
    return this.analyzeConvergence(jobMetrics);
  }

  /**
   * Collect final metrics when job completes
   */
  async collectFinalMetrics(jobId: string): Promise<void> {
    try {
      const jobMetrics = this.jobMetrics.get(jobId);
      if (!jobMetrics) {
        console.warn(`Job metrics not found for ${jobId}`);
        return;
      }
      
      // Calculate final statistics
      const finalReport = this.generateJobReport(jobMetrics);
      
      // Archive metrics
      this.archiveJobMetrics(jobId, finalReport);
      
      // Clean up active job metrics
      this.jobMetrics.delete(jobId);
      
      this.emit('final_metrics_collected', {
        job_id: jobId,
        final_report: finalReport
      });
      
      console.log(`Final metrics collected for job ${jobId}`);
      
    } catch (error) {
      console.error(`Failed to collect final metrics for job ${jobId}:`, error);
    }
  }

  /**
   * Private helper methods
   */
  private initializeSystemMetrics(): SystemMetrics {
    return {
      total_clients: 0,
      active_clients: 0,
      resource_utilization: {
        cpu: 0,
        memory: 0,
        network: 0,
        storage: 0
      },
      security_alerts: 0,
      privacy_violations: 0,
      last_updated: new Date().toISOString()
    };
  }

  private initializeJobMetrics(jobId: string): JobMetrics {
    return {
      job_id: jobId,
      started_at: new Date().toISOString(),
      round_metrics: new Map(),
      aggregation_metrics: new Map(),
      client_metrics: new Map(),
      security_events: [],
      privacy_budget: new Map(),
      convergence_history: [],
      performance_stats: {
        total_training_time: 0,
        average_round_time: 0,
        communication_efficiency: 0,
        resource_utilization: 0,
        convergence_rate: 0
      }
    };
  }

  private updateJobAggregates(
    jobMetrics: JobMetrics,
    metrics: FederatedLearningMetrics
  ): void {
    const rounds = jobMetrics.round_metrics.size;
    const stats = jobMetrics.performance_stats;
    
    // Update averages
    stats.total_training_time += metrics.metrics.computation_time;
    stats.average_round_time = stats.total_training_time / rounds;
    stats.communication_efficiency = 
      (stats.communication_efficiency * (rounds - 1) + 
       (1 - metrics.metrics.communication_overhead)) / rounds;
    stats.resource_utilization = 
      (stats.resource_utilization * (rounds - 1) + 
       metrics.metrics.resource_utilization) / rounds;
  }

  private updateSystemMetrics(metrics: FederatedLearningMetrics): void {
    // Update system-wide performance metrics
    this.systemMetrics.last_updated = new Date().toISOString();
    
    // Security and privacy tracking would be updated here
    if (metrics.metrics.security_score < 0.8) {
      this.systemMetrics.security_alerts++;
    }
    
    if (metrics.metrics.privacy_budget_consumed > 0.9) {
      this.systemMetrics.privacy_violations++;
    }
  }

  private updateConvergenceTracking(
    jobMetrics: JobMetrics,
    aggregationResult: AggregationResult
  ): void {
    jobMetrics.convergence_history.push({
      round_number: aggregationResult.round_number,
      convergence_rate: aggregationResult.convergence_metrics.convergence_rate,
      parameter_stability: aggregationResult.convergence_metrics.parameter_stability,
      loss_improvement: aggregationResult.convergence_metrics.loss_improvement,
      accuracy_improvement: aggregationResult.convergence_metrics.accuracy_improvement,
      timestamp: new Date().toISOString()
    });
  }

  private updateClientPerformanceStats(
    jobMetrics: JobMetrics,
    clientId: string,
    clientMetrics: ClientRoundMetrics
  ): void {
    // Update client-specific performance statistics
    // This would track individual client contributions and performance
  }

  private updateSecurityStats(
    jobMetrics: JobMetrics,
    securityEvent: SecurityEventMetrics
  ): void {
    // Update security event statistics
    if (securityEvent.severity === 'high' || securityEvent.severity === 'critical') {
      this.systemMetrics.security_alerts++;
    }
  }

  private updatePrivacyBudgetTracking(
    jobMetrics: JobMetrics,
    privacyMetrics: PrivacyBudgetMetrics
  ): void {
    // Track privacy budget consumption
    if (privacyMetrics.epsilon_consumed > privacyMetrics.epsilon_total * 0.9) {
      this.systemMetrics.privacy_violations++;
    }
  }

  private generateJobReport(jobMetrics: JobMetrics): JobMetricsReport {
    const totalRounds = jobMetrics.round_metrics.size;
    const latestRound = Math.max(...Array.from(jobMetrics.round_metrics.keys()));
    const latestMetrics = jobMetrics.round_metrics.get(latestRound);
    
    return {
      job_id: jobMetrics.job_id,
      total_rounds: totalRounds,
      performance_summary: jobMetrics.performance_stats,
      latest_metrics: latestMetrics?.metrics,
      convergence_status: this.analyzeConvergence(jobMetrics),
      security_summary: {
        total_events: jobMetrics.security_events.length,
        critical_events: jobMetrics.security_events.filter(e => e.severity === 'critical').length,
        byzantine_detections: this.countByzantineDetections(jobMetrics)
      },
      privacy_summary: this.generatePrivacySummary(jobMetrics),
      client_participation: this.analyzeClientParticipation(jobMetrics)
    };
  }

  private generateJobAnalytics(jobId: string): PerformanceAnalytics {
    const jobMetrics = this.jobMetrics.get(jobId);
    if (!jobMetrics) {
      throw new Error(`Job metrics not found for ${jobId}`);
    }
    
    return {
      convergence_trend: this.calculateConvergenceTrend(jobMetrics),
      efficiency_metrics: this.calculateEfficiencyMetrics(jobMetrics),
      stability_analysis: this.analyzeStability(jobMetrics),
      bottleneck_analysis: this.identifyBottlenecks(jobMetrics)
    };
  }

  private generateSystemAnalytics(): PerformanceAnalytics {
    // Generate system-wide analytics across all jobs
    return {
      convergence_trend: 0,
      efficiency_metrics: {
        communication_efficiency: 0,
        computation_efficiency: 0,
        resource_utilization: 0
      },
      stability_analysis: {
        parameter_stability: 0,
        client_reliability: 0,
        system_robustness: 0
      },
      bottleneck_analysis: {
        communication_bottleneck: 0,
        computation_bottleneck: 0,
        coordination_bottleneck: 0
      }
    };
  }

  private analyzeConvergence(jobMetrics: JobMetrics): ConvergenceAnalysis {
    const history = jobMetrics.convergence_history;
    if (history.length === 0) {
      return {
        current_rate: 0,
        trend: 'unknown',
        estimated_rounds_to_convergence: -1,
        stability_score: 0,
        confidence: 0
      };
    }
    
    const recentHistory = history.slice(-5); // Last 5 rounds
    const currentRate = recentHistory[recentHistory.length - 1]?.convergence_rate || 0;
    const trend = this.calculateTrend(recentHistory.map(h => h.convergence_rate));
    const stabilityScore = this.calculateStabilityScore(recentHistory);
    
    return {
      current_rate: currentRate,
      trend,
      estimated_rounds_to_convergence: this.estimateRoundsToConvergence(history),
      stability_score: stabilityScore,
      confidence: this.calculateConfidence(history)
    };
  }

  private calculateAverageRoundTime(): number {
    const allJobs = Array.from(this.jobMetrics.values());
    if (allJobs.length === 0) return 0;
    
    const totalTime = allJobs.reduce((sum, job) => sum + job.performance_stats.total_training_time, 0);
    const totalRounds = allJobs.reduce((sum, job) => sum + job.round_metrics.size, 0);
    
    return totalRounds > 0 ? totalTime / totalRounds : 0;
  }

  private calculateSystemThroughput(): number {
    // Calculate system throughput (rounds per hour)
    const now = Date.now();
    const oneHourAgo = now - 3600000; // 1 hour in milliseconds
    
    let recentRounds = 0;
    for (const job of this.jobMetrics.values()) {
      for (const [round, metrics] of job.round_metrics.entries()) {
        const recordedAt = new Date(metrics.recorded_at).getTime();
        if (recordedAt > oneHourAgo) {
          recentRounds++;
        }
      }
    }
    
    return recentRounds;
  }

  private startPeriodicCollection(): void {
    this.collectionInterval = setInterval(() => {
      this.performPeriodicMetricsCollection();
    }, this.COLLECTION_INTERVAL);
  }

  private performPeriodicMetricsCollection(): void {
    // Collect system resource metrics
    const resourceMetrics = this.collectResourceMetrics();
    this.systemMetrics.resource_utilization = resourceMetrics;
    this.systemMetrics.last_updated = new Date().toISOString();
    
    // Add to history
    this.metricsHistory.push({
      timestamp: new Date().toISOString(),
      system_metrics: { ...this.systemMetrics },
      job_count: this.jobMetrics.size
    });
    
    // Trim history if too large
    if (this.metricsHistory.length > this.MAX_HISTORY_SIZE) {
      this.metricsHistory = this.metricsHistory.slice(-this.MAX_HISTORY_SIZE / 2);
    }
  }

  private collectResourceMetrics(): any {
    // Collect actual system resource metrics
    // This would interface with system monitoring tools
    return {
      cpu: Math.random() * 100, // Placeholder
      memory: Math.random() * 100,
      network: Math.random() * 100,
      storage: Math.random() * 100
    };
  }

  // Additional helper methods for analytics
  private calculateTrend(values: number[]): 'improving' | 'stable' | 'declining' | 'unknown' {
    if (values.length < 2) return 'unknown';
    
    const recent = values.slice(-3);
    const trend = recent[recent.length - 1] - recent[0];
    
    if (trend > 0.01) return 'improving';
    if (trend < -0.01) return 'declining';
    return 'stable';
  }

  private calculateStabilityScore(history: any[]): number {
    if (history.length < 2) return 0;
    
    const values = history.map(h => h.parameter_stability);
    const variance = this.calculateVariance(values);
    return Math.max(0, 1 - variance);
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  private estimateRoundsToConvergence(history: any[]): number {
    // Simple linear extrapolation based on convergence rate trend
    if (history.length < 3) return -1;
    
    const recentRate = history[history.length - 1].convergence_rate;
    if (recentRate <= 0) return -1;
    
    // Estimate based on current rate (simplified)
    return Math.ceil((1 - recentRate) / (recentRate / history.length));
  }

  private calculateConfidence(history: any[]): number {
    // Calculate confidence based on consistency of convergence
    if (history.length < 3) return 0.5;
    
    const rates = history.map(h => h.convergence_rate);
    const variance = this.calculateVariance(rates);
    return Math.max(0, Math.min(1, 1 - variance * 10));
  }

  private countByzantineDetections(jobMetrics: JobMetrics): number {
    return Array.from(jobMetrics.aggregation_metrics.values())
      .reduce((sum, metrics) => sum + metrics.byzantine_clients_detected, 0);
  }

  private generatePrivacySummary(jobMetrics: JobMetrics): any {
    const budgetEntries = Array.from(jobMetrics.privacy_budget.values());
    if (budgetEntries.length === 0) {
      return { total_epsilon_consumed: 0, budget_efficiency: 1 };
    }
    
    const latest = budgetEntries[budgetEntries.length - 1];
    return {
      total_epsilon_consumed: latest.epsilon_consumed,
      budget_efficiency: latest.epsilon_consumed / latest.epsilon_total,
      delta_consumed: latest.delta_consumed
    };
  }

  private analyzeClientParticipation(jobMetrics: JobMetrics): any {
    const clientIds = new Set<string>();
    for (const clientMetrics of jobMetrics.client_metrics.keys()) {
      clientIds.add(clientMetrics);
    }
    
    return {
      total_participants: clientIds.size,
      participation_rate: clientIds.size / Math.max(1, jobMetrics.round_metrics.size),
      average_participation_per_round: this.calculateAverageParticipation(jobMetrics)
    };
  }

  private calculateAverageParticipation(jobMetrics: JobMetrics): number {
    let totalParticipation = 0;
    let roundCount = 0;
    
    for (const [round, aggregationMetrics] of jobMetrics.aggregation_metrics.entries()) {
      totalParticipation += aggregationMetrics.participating_clients;
      roundCount++;
    }
    
    return roundCount > 0 ? totalParticipation / roundCount : 0;
  }

  private calculateConvergenceTrend(jobMetrics: JobMetrics): number {
    const history = jobMetrics.convergence_history;
    if (history.length < 2) return 0;
    
    const recent = history.slice(-5);
    const rates = recent.map(h => h.convergence_rate);
    
    // Calculate linear trend
    const n = rates.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = rates.reduce((sum, rate) => sum + rate, 0);
    const sumXY = rates.reduce((sum, rate, i) => sum + rate * i, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  private calculateEfficiencyMetrics(jobMetrics: JobMetrics): any {
    return {
      communication_efficiency: jobMetrics.performance_stats.communication_efficiency,
      computation_efficiency: this.calculateComputationEfficiency(jobMetrics),
      resource_utilization: jobMetrics.performance_stats.resource_utilization
    };
  }

  private calculateComputationEfficiency(jobMetrics: JobMetrics): number {
    // Calculate based on training time vs. convergence progress
    const totalTime = jobMetrics.performance_stats.total_training_time;
    const rounds = jobMetrics.round_metrics.size;
    
    if (rounds === 0 || totalTime === 0) return 0;
    
    // Simple efficiency metric: convergence per unit time
    const latestConvergence = jobMetrics.convergence_history.length > 0
      ? jobMetrics.convergence_history[jobMetrics.convergence_history.length - 1].convergence_rate
      : 0;
    
    return latestConvergence / (totalTime / rounds);
  }

  private analyzeStability(jobMetrics: JobMetrics): any {
    const convergenceHistory = jobMetrics.convergence_history;
    if (convergenceHistory.length === 0) {
      return {
        parameter_stability: 0,
        client_reliability: 0,
        system_robustness: 0
      };
    }
    
    const parameterStability = convergenceHistory
      .reduce((sum, h) => sum + h.parameter_stability, 0) / convergenceHistory.length;
    
    const clientReliability = this.calculateClientReliability(jobMetrics);
    const systemRobustness = this.calculateSystemRobustness(jobMetrics);
    
    return {
      parameter_stability: parameterStability,
      client_reliability: clientReliability,
      system_robustness: systemRobustness
    };
  }

  private identifyBottlenecks(jobMetrics: JobMetrics): any {
    // Analyze different types of bottlenecks
    const communicationBottleneck = this.analyzeCommunicationBottleneck(jobMetrics);
    const computationBottleneck = this.analyzeComputationBottleneck(jobMetrics);
    const coordinationBottleneck = this.analyzeCoordinationBottleneck(jobMetrics);
    
    return {
      communication_bottleneck: communicationBottleneck,
      computation_bottleneck: computationBottleneck,
      coordination_bottleneck: coordinationBottleneck
    };
  }

  private calculateClientReliability(jobMetrics: JobMetrics): number {
    // Calculate based on client participation consistency
    let totalExpectedParticipations = 0;
    let actualParticipations = 0;
    
    for (const [round, aggregationMetrics] of jobMetrics.aggregation_metrics.entries()) {
      const expectedClients = jobMetrics.client_metrics.size;
      totalExpectedParticipations += expectedClients;
      actualParticipations += aggregationMetrics.participating_clients;
    }
    
    return totalExpectedParticipations > 0 ? actualParticipations / totalExpectedParticipations : 0;
  }

  private calculateSystemRobustness(jobMetrics: JobMetrics): number {
    // Calculate based on security events and byzantine resilience
    const totalRounds = jobMetrics.round_metrics.size;
    const byzantineDetections = this.countByzantineDetections(jobMetrics);
    const securityEvents = jobMetrics.security_events.filter(e => e.severity === 'high' || e.severity === 'critical').length;
    
    if (totalRounds === 0) return 1;
    
    const byzantineRate = byzantineDetections / totalRounds;
    const securityIncidentRate = securityEvents / totalRounds;
    
    return Math.max(0, 1 - (byzantineRate + securityIncidentRate));
  }

  private analyzeCommunicationBottleneck(jobMetrics: JobMetrics): number {
    // Analyze communication efficiency across rounds
    let totalCommEfficiency = 0;
    let roundCount = 0;
    
    for (const metrics of jobMetrics.round_metrics.values()) {
      totalCommEfficiency += (1 - metrics.metrics.communication_overhead);
      roundCount++;
    }
    
    const avgCommEfficiency = roundCount > 0 ? totalCommEfficiency / roundCount : 1;
    return 1 - avgCommEfficiency; // Higher value indicates more bottleneck
  }

  private analyzeComputationBottleneck(jobMetrics: JobMetrics): number {
    // Analyze computation time distribution
    const computationTimes: number[] = [];
    
    for (const metrics of jobMetrics.round_metrics.values()) {
      computationTimes.push(metrics.metrics.computation_time);
    }
    
    if (computationTimes.length === 0) return 0;
    
    const maxTime = Math.max(...computationTimes);
    const avgTime = computationTimes.reduce((sum, time) => sum + time, 0) / computationTimes.length;
    
    return maxTime > 0 ? (maxTime - avgTime) / maxTime : 0;
  }

  private analyzeCoordinationBottleneck(jobMetrics: JobMetrics): number {
    // Analyze coordination delays and aggregation times
    // This would require timing data for aggregation phases
    return 0; // Placeholder
  }

  private archiveJobMetrics(jobId: string, finalReport: JobMetricsReport): void {
    // Archive completed job metrics for historical analysis
    // In a real implementation, this would store to persistent storage
    console.log(`Archiving metrics for job ${jobId}`);
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
    }
    
    this.jobMetrics.clear();
    this.metricsHistory = [];
    
    console.log('Metrics Collector cleaned up successfully');
  }
}

// Helper interfaces for metrics
interface JobMetrics {
  job_id: string;
  started_at: string;
  round_metrics: Map<number, FederatedLearningMetrics & { recorded_at: string }>;
  aggregation_metrics: Map<number, AggregationMetricsEntry>;
  client_metrics: Map<string, Map<number, ClientRoundMetrics & { recorded_at: string }>>;
  security_events: Array<SecurityEventMetrics & { recorded_at: string }>;
  privacy_budget: Map<number, PrivacyBudgetMetrics & { recorded_at: string }>;
  convergence_history: ConvergenceHistoryEntry[];
  performance_stats: {
    total_training_time: number;
    average_round_time: number;
    communication_efficiency: number;
    resource_utilization: number;
    convergence_rate: number;
  };
}

interface SystemMetrics {
  total_clients: number;
  active_clients: number;
  resource_utilization: {
    cpu: number;
    memory: number;
    network: number;
    storage: number;
  };
  security_alerts: number;
  privacy_violations: number;
  last_updated: string;
}

interface MetricsHistory {
  timestamp: string;
  system_metrics: SystemMetrics;
  job_count: number;
}

interface AggregationMetricsEntry {
  participating_clients: number;
  byzantine_clients_detected: number;
  aggregation_quality_score: number;
  consensus_score: number;
  convergence_rate: number;
  parameter_stability: number;
  recorded_at: string;
}

interface ClientRoundMetrics {
  training_time: number;
  communication_time: number;
  data_samples_used: number;
  local_accuracy: number;
  local_loss: number;
  resource_usage: any;
}

interface SecurityEventMetrics {
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  client_id?: string;
  description: string;
  mitigation_applied: boolean;
}

interface PrivacyBudgetMetrics {
  epsilon_consumed: number;
  epsilon_total: number;
  delta_consumed: number;
  delta_total: number;
  mechanism_used: string;
}

interface ConvergenceHistoryEntry {
  round_number: number;
  convergence_rate: number;
  parameter_stability: number;
  loss_improvement: number;
  accuracy_improvement: number;
  timestamp: string;
}

interface JobMetricsReport {
  job_id: string;
  total_rounds: number;
  performance_summary: any;
  latest_metrics: any;
  convergence_status: ConvergenceAnalysis;
  security_summary: any;
  privacy_summary: any;
  client_participation: any;
}

interface PerformanceAnalytics {
  convergence_trend: number;
  efficiency_metrics: any;
  stability_analysis: any;
  bottleneck_analysis: any;
}

interface ConvergenceAnalysis {
  current_rate: number;
  trend: 'improving' | 'stable' | 'declining' | 'unknown';
  estimated_rounds_to_convergence: number;
  stability_score: number;
  confidence: number;
}
