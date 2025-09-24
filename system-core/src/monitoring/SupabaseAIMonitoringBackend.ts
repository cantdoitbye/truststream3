/**
 * Supabase Implementation of AI Monitoring Backend
 * 
 * Provides Supabase-specific implementation of the AIMonitoringBackend interface
 * while maintaining backend-agnostic design principles.
 */

import { AIMonitoringBackend, AIMetric, AgentPerformanceMetrics, ModelPerformanceMetrics, AIAnomaly, PredictiveInsight, AIAlert } from './AIPerformanceAnalytics';
import { Logger } from '../shared-utils/logger';

export interface SupabaseClient {
  from(table: string): any;
  rpc(functionName: string, params?: any): any;
}

export class SupabaseAIMonitoringBackend implements AIMonitoringBackend {
  private supabase: SupabaseClient;
  private logger: Logger;
  
  constructor(supabase: SupabaseClient, logger: Logger) {
    this.supabase = supabase;
    this.logger = logger;
  }
  
  async storeMetric(metric: AIMetric): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('ai_metrics')
        .insert({
          metric_id: metric.metric_id,
          agent_id: metric.agent_id,
          model_id: metric.model_id,
          metric_name: metric.metric_name,
          metric_value: metric.metric_value,
          metric_unit: metric.metric_unit,
          metric_type: metric.metric_type,
          timestamp: metric.timestamp.toISOString(),
          context: metric.context,
          tags: metric.tags,
          correlation_id: metric.correlation_id
        });
      
      if (error) {
        throw error;
      }
    } catch (error) {
      this.logger.error('Failed to store AI metric', error);
      throw error;
    }
  }
  
  async getMetrics(filters: Record<string, any>): Promise<AIMetric[]> {
    try {
      let query = this.supabase.from('ai_metrics').select('*');
      
      // Apply filters
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }
      
      const { data, error } = await query.order('timestamp', { ascending: false }).limit(1000);
      
      if (error) {
        throw error;
      }
      
      return data.map((row: any) => ({
        metric_id: row.metric_id,
        agent_id: row.agent_id,
        model_id: row.model_id,
        metric_name: row.metric_name,
        metric_value: row.metric_value,
        metric_unit: row.metric_unit,
        metric_type: row.metric_type,
        timestamp: new Date(row.timestamp),
        context: row.context || {},
        tags: row.tags || [],
        correlation_id: row.correlation_id
      }));
    } catch (error) {
      this.logger.error('Failed to get AI metrics', error);
      throw error;
    }
  }
  
  async aggregateMetrics(metricName: string, timeRange: string, groupBy?: string): Promise<Record<string, number>> {
    try {
      const { data, error } = await this.supabase.rpc('aggregate_ai_metrics', {
        metric_name: metricName,
        time_range: timeRange,
        group_by: groupBy
      });
      
      if (error) {
        throw error;
      }
      
      return data || {};
    } catch (error) {
      this.logger.error('Failed to aggregate AI metrics', error);
      throw error;
    }
  }
  
  async storeAgentPerformance(metrics: AgentPerformanceMetrics): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('agent_performance_metrics')
        .upsert({
          agent_id: metrics.agent_id,
          agent_name: metrics.agent_name,
          agent_type: metrics.agent_type,
          response_time_avg: metrics.response_time_avg,
          response_time_p95: metrics.response_time_p95,
          response_time_p99: metrics.response_time_p99,
          success_rate: metrics.success_rate,
          error_rate: metrics.error_rate,
          throughput: metrics.throughput,
          resource_utilization: metrics.resource_utilization,
          quality_score: metrics.quality_score,
          accuracy_score: metrics.accuracy_score,
          user_satisfaction: metrics.user_satisfaction,
          last_updated: metrics.last_updated.toISOString()
        });
      
      if (error) {
        throw error;
      }
    } catch (error) {
      this.logger.error('Failed to store agent performance metrics', error);
      throw error;
    }
  }
  
  async getAgentPerformance(agentId: string, timeRange?: string): Promise<AgentPerformanceMetrics[]> {
    try {
      let query = this.supabase
        .from('agent_performance_metrics')
        .select('*')
        .eq('agent_id', agentId);
      
      if (timeRange) {
        const timeFilter = this.parseTimeRange(timeRange);
        query = query.gte('last_updated', timeFilter.toISOString());
      }
      
      const { data, error } = await query.order('last_updated', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      return data.map((row: any) => ({
        agent_id: row.agent_id,
        agent_name: row.agent_name,
        agent_type: row.agent_type,
        response_time_avg: row.response_time_avg,
        response_time_p95: row.response_time_p95,
        response_time_p99: row.response_time_p99,
        success_rate: row.success_rate,
        error_rate: row.error_rate,
        throughput: row.throughput,
        resource_utilization: row.resource_utilization,
        quality_score: row.quality_score,
        accuracy_score: row.accuracy_score,
        user_satisfaction: row.user_satisfaction,
        last_updated: new Date(row.last_updated)
      }));
    } catch (error) {
      this.logger.error('Failed to get agent performance metrics', error);
      throw error;
    }
  }
  
  async storeModelPerformance(metrics: ModelPerformanceMetrics): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('model_performance_metrics')
        .upsert({
          model_id: metrics.model_id,
          model_name: metrics.model_name,
          model_version: metrics.model_version,
          inference_latency_avg: metrics.inference_latency_avg,
          inference_latency_p95: metrics.inference_latency_p95,
          tokens_per_second: metrics.tokens_per_second,
          gpu_utilization: metrics.gpu_utilization,
          memory_usage: metrics.memory_usage,
          cache_hit_rate: metrics.cache_hit_rate,
          accuracy_metrics: metrics.accuracy_metrics,
          cost_per_request: metrics.cost_per_request,
          error_rate: metrics.error_rate,
          drift_score: metrics.drift_score,
          performance_trend: metrics.performance_trend,
          last_updated: metrics.last_updated.toISOString()
        });
      
      if (error) {
        throw error;
      }
    } catch (error) {
      this.logger.error('Failed to store model performance metrics', error);
      throw error;
    }
  }
  
  async getModelPerformance(modelId: string, timeRange?: string): Promise<ModelPerformanceMetrics[]> {
    try {
      let query = this.supabase
        .from('model_performance_metrics')
        .select('*')
        .eq('model_id', modelId);
      
      if (timeRange) {
        const timeFilter = this.parseTimeRange(timeRange);
        query = query.gte('last_updated', timeFilter.toISOString());
      }
      
      const { data, error } = await query.order('last_updated', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      return data.map((row: any) => ({
        model_id: row.model_id,
        model_name: row.model_name,
        model_version: row.model_version,
        inference_latency_avg: row.inference_latency_avg,
        inference_latency_p95: row.inference_latency_p95,
        tokens_per_second: row.tokens_per_second,
        gpu_utilization: row.gpu_utilization,
        memory_usage: row.memory_usage,
        cache_hit_rate: row.cache_hit_rate,
        accuracy_metrics: row.accuracy_metrics || {},
        cost_per_request: row.cost_per_request,
        error_rate: row.error_rate,
        drift_score: row.drift_score,
        performance_trend: row.performance_trend,
        last_updated: new Date(row.last_updated)
      }));
    } catch (error) {
      this.logger.error('Failed to get model performance metrics', error);
      throw error;
    }
  }
  
  async storeAnomaly(anomaly: AIAnomaly): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('ai_anomalies')
        .insert({
          anomaly_id: anomaly.anomaly_id,
          entity_type: anomaly.entity_type,
          entity_id: anomaly.entity_id,
          anomaly_type: anomaly.anomaly_type,
          severity: anomaly.severity,
          description: anomaly.description,
          detected_at: anomaly.detected_at.toISOString(),
          resolved_at: anomaly.resolved_at?.toISOString(),
          metrics: anomaly.metrics,
          predicted_impact: anomaly.predicted_impact,
          recommended_actions: anomaly.recommended_actions
        });
      
      if (error) {
        throw error;
      }
    } catch (error) {
      this.logger.error('Failed to store AI anomaly', error);
      throw error;
    }
  }
  
  async getAnomalies(filters: Record<string, any>): Promise<AIAnomaly[]> {
    try {
      let query = this.supabase.from('ai_anomalies').select('*');
      
      // Apply filters
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          if (key === 'resolved_at' && value === null) {
            query = query.is('resolved_at', null);
          } else {
            query = query.eq(key, value);
          }
        }
      }
      
      const { data, error } = await query.order('detected_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      return data.map((row: any) => ({
        anomaly_id: row.anomaly_id,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        anomaly_type: row.anomaly_type,
        severity: row.severity,
        description: row.description,
        detected_at: new Date(row.detected_at),
        resolved_at: row.resolved_at ? new Date(row.resolved_at) : undefined,
        metrics: row.metrics || {},
        predicted_impact: row.predicted_impact,
        recommended_actions: row.recommended_actions || []
      }));
    } catch (error) {
      this.logger.error('Failed to get AI anomalies', error);
      throw error;
    }
  }
  
  async resolveAnomaly(anomalyId: string, resolution: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('ai_anomalies')
        .update({
          resolved_at: new Date().toISOString(),
          resolution: resolution
        })
        .eq('anomaly_id', anomalyId);
      
      if (error) {
        throw error;
      }
    } catch (error) {
      this.logger.error('Failed to resolve AI anomaly', error);
      throw error;
    }
  }
  
  async storePredictiveInsight(insight: PredictiveInsight): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('ai_predictive_insights')
        .insert({
          insight_id: insight.insight_id,
          insight_type: insight.insight_type,
          entity_type: insight.entity_type,
          entity_id: insight.entity_id,
          prediction: insight.prediction,
          confidence: insight.confidence,
          time_horizon: insight.time_horizon,
          impact_assessment: insight.impact_assessment,
          recommended_actions: insight.recommended_actions,
          created_at: insight.created_at.toISOString(),
          expires_at: insight.expires_at.toISOString()
        });
      
      if (error) {
        throw error;
      }
    } catch (error) {
      this.logger.error('Failed to store predictive insight', error);
      throw error;
    }
  }
  
  async getPredictiveInsights(filters: Record<string, any>): Promise<PredictiveInsight[]> {
    try {
      let query = this.supabase.from('ai_predictive_insights').select('*');
      
      // Apply filters
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          if (typeof value === 'object' && '>=' in value) {
            query = query.gte(key, value['>=']);
          } else {
            query = query.eq(key, value);
          }
        }
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      return data.map((row: any) => ({
        insight_id: row.insight_id,
        insight_type: row.insight_type,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        prediction: row.prediction,
        confidence: row.confidence,
        time_horizon: row.time_horizon,
        impact_assessment: row.impact_assessment,
        recommended_actions: row.recommended_actions || [],
        created_at: new Date(row.created_at),
        expires_at: new Date(row.expires_at)
      }));
    } catch (error) {
      this.logger.error('Failed to get predictive insights', error);
      throw error;
    }
  }
  
  async storeAlert(alert: AIAlert): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('ai_alerts')
        .insert({
          alert_id: alert.alert_id,
          alert_type: alert.alert_type,
          severity: alert.severity,
          entity_type: alert.entity_type,
          entity_id: alert.entity_id,
          title: alert.title,
          description: alert.description,
          metrics: alert.metrics,
          threshold_config: alert.threshold_config,
          created_at: alert.created_at.toISOString(),
          acknowledged_at: alert.acknowledged_at?.toISOString(),
          resolved_at: alert.resolved_at?.toISOString(),
          escalated_at: alert.escalated_at?.toISOString(),
          actions_taken: alert.actions_taken
        });
      
      if (error) {
        throw error;
      }
    } catch (error) {
      this.logger.error('Failed to store AI alert', error);
      throw error;
    }
  }
  
  async getAlerts(filters: Record<string, any>): Promise<AIAlert[]> {
    try {
      let query = this.supabase.from('ai_alerts').select('*');
      
      // Apply filters
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          if (key === 'resolved_at' && value === null) {
            query = query.is('resolved_at', null);
          } else {
            query = query.eq(key, value);
          }
        }
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      return data.map((row: any) => ({
        alert_id: row.alert_id,
        alert_type: row.alert_type,
        severity: row.severity,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        title: row.title,
        description: row.description,
        metrics: row.metrics || {},
        threshold_config: row.threshold_config,
        created_at: new Date(row.created_at),
        acknowledged_at: row.acknowledged_at ? new Date(row.acknowledged_at) : undefined,
        resolved_at: row.resolved_at ? new Date(row.resolved_at) : undefined,
        escalated_at: row.escalated_at ? new Date(row.escalated_at) : undefined,
        actions_taken: row.actions_taken || []
      }));
    } catch (error) {
      this.logger.error('Failed to get AI alerts', error);
      throw error;
    }
  }
  
  async updateAlert(alertId: string, updates: Partial<AIAlert>): Promise<void> {
    try {
      const updateData: any = {};
      
      if (updates.acknowledged_at) {
        updateData.acknowledged_at = updates.acknowledged_at.toISOString();
      }
      
      if (updates.resolved_at) {
        updateData.resolved_at = updates.resolved_at.toISOString();
      }
      
      if (updates.escalated_at) {
        updateData.escalated_at = updates.escalated_at.toISOString();
      }
      
      if (updates.actions_taken) {
        updateData.actions_taken = updates.actions_taken;
      }
      
      const { error } = await this.supabase
        .from('ai_alerts')
        .update(updateData)
        .eq('alert_id', alertId);
      
      if (error) {
        throw error;
      }
    } catch (error) {
      this.logger.error('Failed to update AI alert', error);
      throw error;
    }
  }
  
  private parseTimeRange(timeRange: string): Date {
    const now = new Date();
    const match = timeRange.match(/^(\d+)([hdwmyn])$/);
    
    if (!match) {
      throw new Error(`Invalid time range format: ${timeRange}`);
    }
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'h': // hours
        return new Date(now.getTime() - value * 60 * 60 * 1000);
      case 'd': // days
        return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
      case 'w': // weeks
        return new Date(now.getTime() - value * 7 * 24 * 60 * 60 * 1000);
      case 'm': // months
        return new Date(now.getTime() - value * 30 * 24 * 60 * 60 * 1000);
      case 'y': // years
        return new Date(now.getTime() - value * 365 * 24 * 60 * 60 * 1000);
      case 'n': // minutes
        return new Date(now.getTime() - value * 60 * 1000);
      default:
        throw new Error(`Unsupported time unit: ${unit}`);
    }
  }
}
