import React from 'react';
import { Cloud, Server, DollarSign, Zap } from 'lucide-react';
import { useMultiCloud } from '@/hooks/useMultiCloud';
import { MetricCard } from '@/components/UI/MetricCard';

export function MultiCloudPage() {
  const { summary, deployments, loading } = useMultiCloud();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-300">Loading Multi-Cloud Orchestration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div 
        className="relative rounded-xl overflow-hidden h-48 flex items-center justify-center"
        style={{
          backgroundImage: 'url(/images/multi_cloud_enterprise_network_architecture_aws_azure_gcp_sdwan_diagram.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
        <div className="relative z-10 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Multi-Cloud Orchestration</h1>
          <p className="text-xl text-cyan-100">AWS, Azure, GCP unified management and cost optimization</p>
        </div>
      </div>

      {/* Metrics */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Deployments"
            value={summary.total_deployments.toString()}
            icon={Server}
            status="good"
            trend="up"
            trendValue="8%"
          />
          
          <MetricCard
            title="Running"
            value={summary.running_deployments.toString()}
            icon={Zap}
            status="good"
            trend="stable"
          />
          
          <MetricCard
            title="Cost Reduction"
            value={`${summary.average_cost_reduction.toFixed(1)}%`}
            target="40%"
            icon={DollarSign}
            status={summary.average_cost_reduction >= 40 ? 'good' : 'warning'}
            trend="up"
            trendValue="2%"
          />
          
          <MetricCard
            title="Cloud Providers"
            value={Object.keys(summary.cloud_distribution || {}).length.toString()}
            icon={Cloud}
            status="good"
            trend="stable"
          />
        </div>
      )}

      <div className="text-center py-12">
        <Cloud className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-400 mb-2">Multi-Cloud Dashboard</h3>
        <p className="text-slate-500">Advanced orchestration features coming soon</p>
      </div>
    </div>
  );
}