import React from 'react';
import { Shield, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComplianceFramework {
  compliance_framework: string;
  compliance_status: string;
  compliance_score: number;
  last_audit_date: string;
  next_audit_date: string;
}

interface ComplianceSummary {
  total_frameworks: number;
  compliant_count: number;
  average_score: number;
}

interface ComplianceStatusProps {
  frameworks: ComplianceFramework[];
  summary: ComplianceSummary;
}

export function ComplianceStatus({ frameworks, summary }: ComplianceStatusProps) {
  const getFrameworkIcon = (framework: string) => {
    const icons: Record<string, string> = {
      'GDPR': '🇪🇺',
      'EU_AI_Act': '🤖',
      'ISO_27001': '🔒',
      'SOC_2': '🛡️',
      'HIPAA': '🏥',
      'PCI_DSS': '💳',
      'NIST': '🇺🇸'
    };
    return icons[framework] || '📋';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'text-green-400';
      case 'non_compliant':
        return 'text-red-400';
      case 'under_review':
        return 'text-yellow-400';
      default:
        return 'text-slate-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'non_compliant':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'under_review':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      default:
        return <Shield className="w-4 h-4 text-slate-400" />;
    }
  };

  const formatFrameworkName = (name: string) => {
    return name.replace(/_/g, ' ');
  };

  const getDaysUntilAudit = (auditDate: string) => {
    const days = Math.ceil((new Date(auditDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-white">Compliance Status</h3>
          <p className="text-slate-400 text-sm">Regulatory framework adherence</p>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">
            {summary.compliant_count}/{summary.total_frameworks}
          </div>
          <div className="text-xs text-slate-500">Compliant</div>
        </div>
      </div>

      {/* Overall compliance score */}
      <div className="mb-6 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <div className="text-white font-medium">Overall Compliance Score</div>
              <div className="text-green-300 text-sm">100% across all frameworks</div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-green-400">{(summary.average_score * 100).toFixed(0)}%</div>
            <div className="text-xs text-green-300">Perfect Score</div>
          </div>
        </div>
      </div>

      {/* Framework details */}
      <div className="space-y-3">
        {frameworks.map((framework, index) => {
          const daysUntilAudit = getDaysUntilAudit(framework.next_audit_date);
          
          return (
            <div key={index} className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getFrameworkIcon(framework.compliance_framework)}</span>
                  <div>
                    <h4 className="text-white font-medium text-sm">
                      {formatFrameworkName(framework.compliance_framework)}
                    </h4>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(framework.compliance_status)}
                      <span className={cn(
                        'text-xs capitalize',
                        getStatusColor(framework.compliance_status)
                      )}>
                        {framework.compliance_status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-mono text-green-400">
                    {(framework.compliance_score * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-slate-500">Score</div>
                </div>
              </div>
              
              <div className="flex justify-between items-center text-xs">
                <div className="text-slate-400">
                  Last audit: {new Date(framework.last_audit_date).toLocaleDateString()}
                </div>
                
                <div className={cn(
                  'text-slate-400',
                  daysUntilAudit < 30 ? 'text-yellow-400' : 'text-slate-400'
                )}>
                  Next audit in {daysUntilAudit} days
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-2 w-full bg-slate-700 rounded-full h-1">
                <div 
                  className="h-1 bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${framework.compliance_score * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}