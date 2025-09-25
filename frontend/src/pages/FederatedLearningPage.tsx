import React from 'react';
import { Network, Users, Shield, Zap, Plus, Play, Pause, BarChart3 } from 'lucide-react';
import { useFederatedLearning } from '@/hooks/useFederatedLearning';
import { MetricCard } from '@/components/UI/MetricCard';

export function FederatedLearningPage() {
  const { summary, jobs, loading, createJob } = useFederatedLearning();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-300">Loading Federated Learning System...</span>
        </div>
      </div>
    );
  }

  const handleCreateJob = async () => {
    try {
      await createJob({
        job_name: `FL-Job-${Date.now()}`,
        job_type: 'horizontal',
        framework: 'flower',
        model_config: { model_type: 'neural_network', layers: 5 },
        data_config: { dataset: 'healthcare_v2', privacy_level: 'high' },
        num_clients: 25,
        num_rounds: 10,
        privacy_budget: 8.0
      });
    } catch (error) {
      console.error('Failed to create federated learning job:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with hero image */}
      <div 
        className="relative rounded-xl overflow-hidden h-48 flex items-center justify-center"
        style={{
          backgroundImage: 'url(/images/federated_learning_neural_network_diagram_ai_platform.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
        <div className="relative z-10 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Federated Learning Operations</h1>
          <p className="text-xl text-cyan-100">Distributed machine learning across {summary?.total_jobs || 0} active training jobs</p>
        </div>
      </div>

      {/* Key metrics */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Jobs"
            value={summary.total_jobs.toString()}
            icon={Network}
            status="good"
            trend="up"
            trendValue="12%"
          />
          
          <MetricCard
            title="Running Jobs"
            value={summary.running_jobs.toString()}
            icon={Play}
            status={summary.running_jobs > 0 ? 'good' : 'warning'}
            trend="stable"
          />
          
          <MetricCard
            title="Success Rate"
            value={`${summary.success_rate}%`}
            target=">90%"
            icon={BarChart3}
            status={parseFloat(summary.success_rate) > 90 ? 'good' : 'warning'}
            trend="up"
            trendValue="5%"
          />
          
          <MetricCard
            title="Frameworks"
            value={summary.frameworks_used.length.toString()}
            icon={Shield}
            status="good"
            trend="stable"
          />
        </div>
      )}

      {/* Controls and job creation */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Active Training Jobs</h2>
          <p className="text-slate-400">Monitor and manage federated learning operations</p>
        </div>
        
        <button
          onClick={handleCreateJob}
          className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
        >
          <Plus className="w-5 h-5" />
          <span>Create New Job</span>
        </button>
      </div>

      {/* Jobs list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {jobs.length > 0 ? jobs.map((job) => (
          <div key={job.id} className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{job.job_name}</h3>
                <p className="text-slate-400 text-sm capitalize">{job.job_type} • {job.framework}</p>
              </div>
              
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                job.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                job.status === 'running' ? 'bg-cyan-500/20 text-cyan-400' :
                job.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {job.status.toUpperCase()}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-slate-400 text-xs">Clients</div>
                <div className="text-white font-mono">{job.num_clients}</div>
              </div>
              
              <div>
                <div className="text-slate-400 text-xs">Rounds</div>
                <div className="text-white font-mono">{job.current_round}/{job.num_rounds}</div>
              </div>
              
              <div>
                <div className="text-slate-400 text-xs">Privacy Budget</div>
                <div className="text-white font-mono">{job.privacy_budget}</div>
              </div>
              
              <div>
                <div className="text-slate-400 text-xs">Created</div>
                <div className="text-white font-mono text-xs">
                  {new Date(job.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Training Progress</span>
                <span>{Math.round((job.current_round / job.num_rounds) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className="h-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${(job.current_round / job.num_rounds) * 100}%` }}
                />
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex space-x-2">
              <button className="flex-1 flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 px-4 rounded-lg text-sm transition-colors">
                <BarChart3 className="w-4 h-4" />
                <span>View Metrics</span>
              </button>
              
              <button className="flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 px-4 rounded-lg text-sm transition-colors">
                {job.status === 'running' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )) : (
          <div className="col-span-2 text-center py-12">
            <Network className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-400 mb-2">No Active Jobs</h3>
            <p className="text-slate-500">Create your first federated learning job to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}