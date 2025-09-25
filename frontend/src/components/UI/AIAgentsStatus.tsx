import React from 'react';
import { Brain, Zap, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Agent {
  id: string;
  agent_name: string;
  agent_type: string;
  status: string;
  trust_score: number;
  success_rate: number;
  response_time_ms: number;
  performance_metrics: Record<string, any>;
}

interface AIAgentsSummary {
  total_agents: number;
  active_agents: number;
  average_success_rate: number;
  average_response_time_ms: number;
  average_trust_score: number;
}

interface AIAgentsStatusProps {
  agents: Agent[];
  summary: AIAgentsSummary;
}

export function AIAgentsStatus({ agents, summary }: AIAgentsStatusProps) {
  const getAgentTypeIcon = (type: string) => {
    switch (type) {
      case 'efficiency':
        return <Zap className="w-5 h-5 text-yellow-400" />;
      case 'quality':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case 'transparency':
        return <Brain className="w-5 h-5 text-blue-400" />;
      case 'accountability':
        return <AlertCircle className="w-5 h-5 text-purple-400" />;
      case 'innovation':
        return <Clock className="w-5 h-5 text-pink-400" />;
      default:
        return <Brain className="w-5 h-5 text-cyan-400" />;
    }
  };

  const getAgentTypeColor = (type: string) => {
    switch (type) {
      case 'efficiency':
        return 'border-yellow-500/30 bg-yellow-500/5';
      case 'quality':
        return 'border-green-500/30 bg-green-500/5';
      case 'transparency':
        return 'border-blue-500/30 bg-blue-500/5';
      case 'accountability':
        return 'border-purple-500/30 bg-purple-500/5';
      case 'innovation':
        return 'border-pink-500/30 bg-pink-500/5';
      default:
        return 'border-cyan-500/30 bg-cyan-500/5';
    }
  };

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'active':
        return <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />;
      case 'inactive':
        return <div className="w-2 h-2 bg-red-400 rounded-full" />;
      case 'maintenance':
        return <div className="w-2 h-2 bg-yellow-400 rounded-full" />;
      default:
        return <div className="w-2 h-2 bg-gray-400 rounded-full" />;
    }
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-white">AI Governance Agents</h3>
          <p className="text-slate-400 text-sm">5 Leader Agents monitoring system integrity</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-center">
            <div className="text-sm font-mono text-cyan-400">{summary.active_agents}/{summary.total_agents}</div>
            <div className="text-xs text-slate-500">Active</div>
          </div>
          
          <div className="text-center">
            <div className="text-sm font-mono text-green-400">{(summary.average_success_rate * 100).toFixed(1)}%</div>
            <div className="text-xs text-slate-500">Success Rate</div>
          </div>
          
          <div className="text-center">
            <div className="text-sm font-mono text-yellow-400">{summary.average_response_time_ms.toFixed(0)}ms</div>
            <div className="text-xs text-slate-500">Avg Response</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className={cn(
              'p-4 rounded-lg border backdrop-blur transition-all duration-200 hover:scale-[1.02]',
              getAgentTypeColor(agent.agent_type)
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                {getAgentTypeIcon(agent.agent_type)}
                <div>
                  <h4 className="text-white font-medium text-sm">{agent.agent_name}</h4>
                  <p className="text-slate-400 text-xs capitalize">{agent.agent_type} Agent</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {getStatusIndicator(agent.status)}
                <span className="text-xs text-slate-400 capitalize">{agent.status}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="text-center">
                <div className="text-cyan-400 font-mono">{(agent.trust_score * 100).toFixed(0)}%</div>
                <div className="text-slate-500">Trust</div>
              </div>
              
              <div className="text-center">
                <div className="text-green-400 font-mono">{(agent.success_rate * 100).toFixed(0)}%</div>
                <div className="text-slate-500">Success</div>
              </div>
              
              <div className="text-center">
                <div className="text-yellow-400 font-mono">{agent.response_time_ms}ms</div>
                <div className="text-slate-500">Response</div>
              </div>
            </div>
            
            {/* Performance metrics preview */}
            <div className="mt-3 pt-3 border-t border-slate-700/30">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Recent Performance</span>
                <div className="flex space-x-1">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-1 h-3 rounded-full',
                        Math.random() > 0.2 ? 'bg-green-400' : 'bg-red-400'
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}