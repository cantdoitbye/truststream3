import React from 'react';
import { Brain, Zap, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';
import { useSystemStatus } from '@/hooks/useSystemStatus';
import { AIAgentsStatus } from '@/components/UI/AIAgentsStatus';
import { MetricCard } from '@/components/UI/MetricCard';

export function AIGovernancePage() {
  const { systemStatus, loading } = useSystemStatus();

  if (loading || !systemStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-300">Loading AI Governance System...</span>
        </div>
      </div>
    );
  }

  const aiGovernance = systemStatus.ai_governance;

  return (
    <div className="space-y-6">
      {/* Header with hero image */}
      <div 
        className="relative rounded-xl overflow-hidden h-48 flex items-center justify-center"
        style={{
          backgroundImage: 'url(/images/futuristic_enterprise_ai_dashboard_neon_blue_background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
        <div className="relative z-10 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">AI Governance Center</h1>
          <p className="text-xl text-cyan-100">5 AI Leader Agents ensuring system integrity and ethical operation</p>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Active Agents"
          value={`${aiGovernance.active_agents}/${aiGovernance.total_agents}`}
          icon={Brain}
          status="good"
          trend="stable"
        />
        
        <MetricCard
          title="Average Success Rate"
          value={`${(aiGovernance.average_success_rate * 100).toFixed(1)}%`}
          target=">85%"
          icon={CheckCircle2}
          status={aiGovernance.average_success_rate > 0.85 ? 'good' : 'warning'}
          trend="up"
          trendValue="3%"
        />
        
        <MetricCard
          title="Avg Response Time"
          value={`${aiGovernance.average_response_time_ms.toFixed(0)}ms`}
          target="<35ms"
          icon={Zap}
          status={aiGovernance.average_response_time_ms < 35 ? 'good' : 'warning'}
          trend="down"
          trendValue="5%"
        />
        
        <MetricCard
          title="Trust Score"
          value={`${(aiGovernance.average_trust_score * 100).toFixed(1)}%`}
          target=">90%"
          icon={TrendingUp}
          status={aiGovernance.average_trust_score > 0.9 ? 'good' : 'warning'}
          trend="up"
          trendValue="2%"
        />
      </div>

      {/* AI Agents detailed status */}
      <AIAgentsStatus agents={aiGovernance.agents} summary={aiGovernance} />

      {/* Agent performance insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Performance Trends</h3>
          
          <div className="space-y-4">
            {aiGovernance.agents.map((agent, index) => (
              <div key={agent.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    agent.agent_type === 'efficiency' ? 'bg-yellow-500/20' :
                    agent.agent_type === 'quality' ? 'bg-green-500/20' :
                    agent.agent_type === 'transparency' ? 'bg-blue-500/20' :
                    agent.agent_type === 'accountability' ? 'bg-purple-500/20' :
                    'bg-pink-500/20'
                  }`}>
                    <Brain className={`w-4 h-4 ${
                      agent.agent_type === 'efficiency' ? 'text-yellow-400' :
                      agent.agent_type === 'quality' ? 'text-green-400' :
                      agent.agent_type === 'transparency' ? 'text-blue-400' :
                      agent.agent_type === 'accountability' ? 'text-purple-400' :
                      'text-pink-400'
                    }`} />
                  </div>
                  
                  <div>
                    <div className="text-white font-medium text-sm">{agent.agent_name}</div>
                    <div className="text-slate-400 text-xs">Last 24h performance</div>
                  </div>
                </div>
                
                <div className="flex space-x-1">
                  {[...Array(24)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 h-8 rounded-full ${
                        Math.random() > 0.15 ? 'bg-green-400' : 'bg-yellow-400'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Agent Responsibilities</h3>
          
          <div className="space-y-4">
            {[
              {
                name: 'Efficiency Leader',
                type: 'efficiency',
                responsibilities: ['Resource optimization', 'Performance monitoring', 'Cost reduction strategies'],
                color: 'yellow'
              },
              {
                name: 'Quality Assurance Agent',
                type: 'quality',
                responsibilities: ['Code quality checks', 'Testing automation', 'Defect prevention'],
                color: 'green'
              },
              {
                name: 'Transparency Guardian',
                type: 'transparency',
                responsibilities: ['Audit trail maintenance', 'Compliance reporting', 'Decision logging'],
                color: 'blue'
              },
              {
                name: 'Accountability Monitor',
                type: 'accountability',
                responsibilities: ['Responsibility tracking', 'Decision attribution', 'Governance oversight'],
                color: 'purple'
              },
              {
                name: 'Innovation Catalyst',
                type: 'innovation',
                responsibilities: ['R&D initiatives', 'Technology scouting', 'Breakthrough identification'],
                color: 'pink'
              }
            ].map((agent, index) => (
              <div key={index} className="p-4 bg-slate-800/30 rounded-lg">
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`w-6 h-6 rounded-lg bg-${agent.color}-500/20 flex items-center justify-center`}>
                    <Brain className={`w-3 h-3 text-${agent.color}-400`} />
                  </div>
                  <h4 className="text-white font-medium text-sm">{agent.name}</h4>
                </div>
                
                <ul className="space-y-1">
                  {agent.responsibilities.map((responsibility, idx) => (
                    <li key={idx} className="text-xs text-slate-400 flex items-center space-x-2">
                      <div className="w-1 h-1 bg-slate-500 rounded-full" />
                      <span>{responsibility}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}