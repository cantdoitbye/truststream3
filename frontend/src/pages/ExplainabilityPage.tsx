import React, { useState } from 'react';
import { Search, Brain, AlertTriangle, CheckCircle2, Clock, Plus } from 'lucide-react';
import { useAIExplainability } from '@/hooks/useAIExplainability';
import { MetricCard } from '@/components/UI/MetricCard';

export function ExplainabilityPage() {
  const { summary, requests, loading, createExplanation } = useAIExplainability();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreateExplanation = async () => {
    try {
      await createExplanation({
        request_type: 'shap',
        model_id: `model_${Date.now()}`,
        input_data: { feature1: 0.8, feature2: 0.3, feature3: 0.9 },
        stakeholder_type: 'technical_user'
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create explanation:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-300">Loading AI Explainability System...</span>
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
          backgroundImage: 'url(/images/ai_explainability_decision_tree_visualization.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
        <div className="relative z-10 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">AI Explainability Center</h1>
          <p className="text-xl text-cyan-100">Model transparency, bias auditing, and stakeholder-specific explanations</p>
        </div>
      </div>

      {/* Metrics */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Requests"
            value={summary.total_requests.toString()}
            icon={Search}
            status="good"
            trend="up"
            trendValue="15%"
          />
          
          <MetricCard
            title="Success Rate"
            value={`${summary.success_rate}%`}
            target=">95%"
            icon={CheckCircle2}
            status={parseFloat(summary.success_rate) > 95 ? 'good' : 'warning'}
            trend="up"
            trendValue="3%"
          />
          
          <MetricCard
            title="Avg Processing Time"
            value={`${summary.average_processing_time_ms}ms`}
            target="<2000ms"
            icon={Clock}
            status={summary.average_processing_time_ms < 2000 ? 'good' : 'warning'}
            trend="down"
            trendValue="8%"
          />
          
          <MetricCard
            title="Processing"
            value={summary.processing_requests.toString()}
            icon={Brain}
            status={summary.processing_requests === 0 ? 'good' : 'warning'}
            trend="stable"
          />
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Explanation Requests</h2>
          <p className="text-slate-400">Generate model explanations for different stakeholders</p>
        </div>
        
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
        >
          <Plus className="w-5 h-5" />
          <span>Generate Explanation</span>
        </button>
      </div>

      {/* Request form */}
      {showCreateForm && (
        <div className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Create Explanation Request</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Explanation Type</label>
              <select className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white">
                <option value="shap">SHAP Analysis</option>
                <option value="lime">LIME Explanation</option>
                <option value="counterfactual">Counterfactual Analysis</option>
                <option value="feature_importance">Feature Importance</option>
                <option value="bias_audit">Bias Audit</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Stakeholder Type</label>
              <select className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white">
                <option value="technical_user">Technical User</option>
                <option value="business_user">Business User</option>
                <option value="end_user">End User</option>
                <option value="regulator">Regulator</option>
              </select>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleCreateExplanation}
              className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Generate
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Requests list */}
      <div className="space-y-4">
        {requests.length > 0 ? requests.map((request) => (
          <div key={request.id} className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-white">Model: {request.model_id}</h3>
                <p className="text-slate-400 text-sm capitalize">
                  {request.request_type} • {request.stakeholder_type.replace('_', ' ')}
                </p>
              </div>
              
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                request.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                request.status === 'processing' ? 'bg-cyan-500/20 text-cyan-400' :
                request.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {request.status.toUpperCase()}
              </div>
            </div>
            
            {request.explanation_result && Object.keys(request.explanation_result).length > 0 && (
              <div className="bg-slate-800/30 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">Explanation Results</h4>
                <div className="text-sm text-slate-300">
                  <p><strong>Confidence:</strong> {(request.explanation_result.confidence * 100).toFixed(1)}%</p>
                  <p><strong>Method:</strong> {request.explanation_result.method?.toUpperCase()}</p>
                  <p><strong>Summary:</strong> {request.explanation_result.explanation_summary}</p>
                </div>
              </div>
            )}
            
            <div className="flex justify-between items-center mt-4 text-xs text-slate-400">
              <span>Processing time: {request.processing_time_ms}ms</span>
              <span>Created: {new Date(request.created_at).toLocaleString()}</span>
            </div>
          </div>
        )) : (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-400 mb-2">No Explanation Requests</h3>
            <p className="text-slate-500">Generate your first AI explanation to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}