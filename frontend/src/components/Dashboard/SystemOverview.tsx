import React from 'react';
import { Activity, Zap, Shield, Users, TrendingUp, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useSystemStatus } from '@/hooks/useSystemStatus';
import { MetricCard } from '@/components/UI/MetricCard';
import { TrustScoreVisualizer } from '@/components/UI/TrustScoreVisualizer';
import { PerformanceChart } from '@/components/UI/PerformanceChart';
import { AIAgentsStatus } from '@/components/UI/AIAgentsStatus';
import { ComplianceStatus } from '@/components/UI/ComplianceStatus';

export function SystemOverview() {
  const { systemStatus, loading, error } = useSystemStatus();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-300">Loading TrustStram v4.4 System Status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="w-6 h-6 text-red-400" />
          <div>
            <h3 className="text-red-400 font-medium">System Status Error</h3>
            <p className="text-red-300/80 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!systemStatus) return null;

  const performanceMetrics = systemStatus.system_metrics.performance_summary;
  const aiGovernance = systemStatus.ai_governance;
  const trustScoring = systemStatus.trust_scoring;
  const compliance = systemStatus.compliance;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">TrustStram v4.4 Enterprise Platform</h1>
          <p className="text-slate-400">Real-time system monitoring and AI governance dashboard</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg px-4 py-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 font-medium">OPERATIONAL</span>
            </div>
          </div>
          
          <div className="text-sm text-slate-400">
            Last updated: {new Date(systemStatus.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="API Response Time"
          value={`${performanceMetrics.api_response_time}ms`}
          target="<35ms"
          icon={Zap}
          trend="down"
          trendValue="12%"
          status={performanceMetrics.api_response_time < 35 ? 'good' : 'warning'}
        />
        
        <MetricCard
          title="System Throughput"
          value={`${(performanceMetrics.system_throughput / 1000).toFixed(1)}K RPS`}
          target=">52K RPS"
          icon={Activity}
          trend="up"
          trendValue="8%"
          status={performanceMetrics.system_throughput > 52000 ? 'good' : 'warning'}
        />
        
        <MetricCard
          title="AI Agent Success"
          value={`${(aiGovernance.average_success_rate * 100).toFixed(1)}%`}
          target=">85%"
          icon={Users}
          trend="up"
          trendValue="5%"
          status={aiGovernance.average_success_rate > 0.85 ? 'good' : 'warning'}
        />
        
        <MetricCard
          title="System Uptime"
          value={`${performanceMetrics.system_uptime}%`}
          target="99.99%"
          icon={Shield}
          trend="stable"
          trendValue="0%"
          status={performanceMetrics.system_uptime >= 99.99 ? 'good' : 'warning'}
        />
      </div>

      {/* Main dashboard grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Governance Agents */}
        <div className="lg:col-span-2">
          <AIAgentsStatus agents={aiGovernance.agents} summary={aiGovernance} />
        </div>
        
        {/* 4D Trust Score */}
        <div>
          <TrustScoreVisualizer 
            trustScore={trustScoring.system_trust_score}
            dimensions={trustScoring.trust_dimensions}
          />
        </div>
      </div>

      {/* Performance Charts and Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trends */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Performance Trends</h3>
            <TrendingUp className="w-5 h-5 text-cyan-400" />
          </div>
          
          <PerformanceChart metrics={systemStatus.system_metrics.latest_metrics} />
        </div>
        
        {/* Compliance Status */}
        <div>
          <ComplianceStatus 
            frameworks={compliance.frameworks}
            summary={compliance}
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Recent System Activity</h3>
          <Clock className="w-5 h-5 text-cyan-400" />
        </div>
        
        <div className="space-y-3">
          {[
            { time: '2 min ago', event: 'Federated Learning job "Healthcare-Model-v3" completed successfully', type: 'success' },
            { time: '5 min ago', event: 'Multi-cloud deployment scaled up on AWS us-east-1', type: 'info' },
            { time: '8 min ago', event: 'Quantum encryption operation: 15,847 keys generated', type: 'info' },
            { time: '12 min ago', event: 'AI Explainability audit completed for Model-2847', type: 'success' },
            { time: '15 min ago', event: 'Compliance check: All 7 frameworks remain fully compliant', type: 'success' }
          ].map((activity, index) => (
            <div key={index} className="flex items-center space-x-4 p-3 bg-slate-800/30 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${
                activity.type === 'success' ? 'bg-green-400' : 
                activity.type === 'warning' ? 'bg-yellow-400' : 'bg-cyan-400'
              }`} />
              
              <div className="flex-1">
                <p className="text-slate-200 text-sm">{activity.event}</p>
                <p className="text-slate-500 text-xs mt-1">{activity.time}</p>
              </div>
              
              <CheckCircle2 className={`w-4 h-4 ${
                activity.type === 'success' ? 'text-green-400' : 
                activity.type === 'warning' ? 'text-yellow-400' : 'text-cyan-400'
              }`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}