import React from 'react';
import { Shield, CheckCircle2, AlertTriangle, FileCheck } from 'lucide-react';
import { useSystemStatus } from '@/hooks/useSystemStatus';
import { ComplianceStatus } from '@/components/UI/ComplianceStatus';
import { MetricCard } from '@/components/UI/MetricCard';

export function CompliancePage() {
  const { systemStatus, loading } = useSystemStatus();

  if (loading || !systemStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-300">Loading Compliance Dashboard...</span>
        </div>
      </div>
    );
  }

  const compliance = systemStatus.compliance;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Compliance Dashboard</h1>
        <p className="text-xl text-slate-400">GDPR, EU AI Act, ISO 27001, SOC 2, HIPAA, PCI DSS, NIST Framework Compliance</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Frameworks"
          value={compliance.total_frameworks.toString()}
          icon={FileCheck}
          status="good"
          trend="stable"
        />
        
        <MetricCard
          title="Compliant"
          value={`${compliance.compliant_count}/${compliance.total_frameworks}`}
          icon={CheckCircle2}
          status={compliance.compliant_count === compliance.total_frameworks ? 'good' : 'warning'}
          trend="stable"
        />
        
        <MetricCard
          title="Avg Score"
          value={`${(compliance.average_score * 100).toFixed(0)}%`}
          target="100%"
          icon={Shield}
          status={compliance.average_score >= 1 ? 'good' : 'warning'}
          trend="stable"
        />
        
        <MetricCard
          title="Status"
          value="COMPLIANT"
          icon={Shield}
          status="good"
          trend="stable"
        />
      </div>

      {/* Compliance details */}
      <ComplianceStatus frameworks={compliance.frameworks} summary={compliance} />
    </div>
  );
}