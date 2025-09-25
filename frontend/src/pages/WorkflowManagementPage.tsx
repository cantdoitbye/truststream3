import React, { useState, useEffect } from 'react';
import { Settings, Play, Pause, Trash2, BarChart3, DollarSign, Clock, CheckCircle2, AlertTriangle, Zap, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MetricCard } from '@/components/UI/MetricCard';
import { cn } from '@/lib/utils';

interface Workflow {
  workflowId: string;
  name: string;
  version: string;
  category: string;
  nodeCount: number;
  supportedNodeCount: number;
  complexityScore: number;
  validationStatus: string;
  securityScore: number;
  estimatedCostPerRun: number;
  actualRunsCount: number;
  averageActualCost: number;
  costPredictionAccuracy: number;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
  resourceEstimate: {
    cpuCores: number;
    memoryMb: number;
    gpuCores: number;
    storageMb: number;
  };
  costBreakdown: {
    baseCost: number;
    complexityCost: number;
    aiCost: number;
    integrationCost: number;
  };
  validationWarnings: string[];
  validationErrors: string[];
  securityIssues: string[];
  tags: string[];
  recentUsage: any[];
  status: string;
}

interface WorkflowData {
  workflows: Workflow[];
  summary: {
    totalWorkflows: number;
    activeWorkflows: number;
    totalRuns: number;
    averageComplexity: number;
    totalEstimatedCost: number;
  };
}

export function WorkflowManagementPage() {
  const { user } = useAuth();
  const [workflowData, setWorkflowData] = useState<WorkflowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase.functions.invoke('workflow-management', {
        body: { action: 'list' }
      });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      if (data?.success) {
        setWorkflowData(data.data);
      } else {
        throw new Error(data?.error?.message || 'Failed to load workflows');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async (workflowId: string) => {
    setActionLoading(workflowId);

    try {
      const { data, error: supabaseError } = await supabase.functions.invoke('workflow-management', {
        body: { workflowId, action: 'deploy' }
      });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      if (data?.success) {
        await loadWorkflows(); // Refresh the list
        alert('Workflow deployed successfully!');
      } else {
        throw new Error(data?.error?.message || 'Deployment failed');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Deployment failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStatus = async (workflowId: string, status: string) => {
    setActionLoading(workflowId);

    try {
      const { data, error: supabaseError } = await supabase.functions.invoke('workflow-management', {
        body: { workflowId, status, action: 'update-status' }
      });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      if (data?.success) {
        await loadWorkflows(); // Refresh the list
      } else {
        throw new Error(data?.error?.message || 'Status update failed');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) {
      return;
    }

    setActionLoading(workflowId);

    try {
      const { data, error: supabaseError } = await supabase.functions.invoke('workflow-management', {
        body: { workflowId, action: 'delete' }
      });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      if (data?.success) {
        await loadWorkflows(); // Refresh the list
      } else {
        throw new Error(data?.error?.message || 'Delete failed');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'deployed': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'ready': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'running': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'draft': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'archived': return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getValidationStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'text-green-400';
      case 'invalid': return 'text-red-400';
      case 'needs_review': return 'text-yellow-400';
      default: return 'text-slate-400';
    }
  };

  const formatCost = (cost: number) => {
    return cost.toFixed(6);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-300">Loading workflows...</span>
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
            <h3 className="text-red-400 font-medium">Error Loading Workflows</h3>
            <p className="text-red-300/80 text-sm mt-1">{error}</p>
            <button 
              onClick={loadWorkflows}
              className="mt-3 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Workflow Management</h1>
          <p className="text-slate-400">Manage and deploy your n8n workflow agents</p>
        </div>
        <button 
          onClick={loadWorkflows}
          className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Summary Metrics */}
      {workflowData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <MetricCard
            title="Total Workflows"
            value={workflowData.summary.totalWorkflows.toString()}
            icon={Settings}
            status="good"
          />
          
          <MetricCard
            title="Active Workflows"
            value={workflowData.summary.activeWorkflows.toString()}
            icon={CheckCircle2}
            status="good"
          />
          
          <MetricCard
            title="Total Runs"
            value={workflowData.summary.totalRuns.toString()}
            icon={Play}
            status="good"
          />
          
          <MetricCard
            title="Avg Complexity"
            value={workflowData.summary.averageComplexity.toFixed(1)}
            target="<80"
            icon={BarChart3}
            status={workflowData.summary.averageComplexity < 80 ? 'good' : 'warning'}
          />
          
          <MetricCard
            title="Total Est. Cost"
            value={`${formatCost(workflowData.summary.totalEstimatedCost)} OC`}
            icon={DollarSign}
            status="good"
          />
        </div>
      )}

      {/* Workflows List */}
      <div className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Your Workflows</h3>
          <Settings className="w-5 h-5 text-cyan-400" />
        </div>

        {!workflowData || workflowData.workflows.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings className="w-8 h-8 text-slate-400" />
            </div>
            <h4 className="text-white font-medium mb-2">No Workflows Found</h4>
            <p className="text-slate-400 text-sm">Upload your first n8n workflow to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {workflowData.workflows.map((workflow) => (
              <div
                key={workflow.workflowId}
                className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h4 className="text-white font-medium">{workflow.name}</h4>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-slate-400 text-sm">ID: {workflow.workflowId.slice(0, 8)}...</span>
                        <span className="text-slate-400 text-sm">Category: {workflow.category}</span>
                        <span className="text-slate-400 text-sm">Nodes: {workflow.nodeCount}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className={cn('px-3 py-1 rounded-full text-xs font-medium border', getStatusColor(workflow.status))}>
                      {workflow.status.toUpperCase()}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {workflow.status === 'ready' && (
                        <button
                          onClick={() => handleDeploy(workflow.workflowId)}
                          disabled={actionLoading === workflow.workflowId}
                          className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
                          title="Deploy Workflow"
                        >
                          {actionLoading === workflow.workflowId ? (
                            <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      
                      {workflow.status === 'deployed' && (
                        <button
                          onClick={() => handleUpdateStatus(workflow.workflowId, 'paused')}
                          disabled={actionLoading === workflow.workflowId}
                          className="p-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
                          title="Pause Workflow"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => setSelectedWorkflow(selectedWorkflow?.workflowId === workflow.workflowId ? null : workflow)}
                        className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDelete(workflow.workflowId)}
                        disabled={actionLoading === workflow.workflowId}
                        className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                        title="Delete Workflow"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Complexity:</span>
                    <span className="text-white ml-2">{workflow.complexityScore}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Security:</span>
                    <span className="text-white ml-2">{workflow.securityScore}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Validation:</span>
                    <span className={cn('ml-2', getValidationStatusColor(workflow.validationStatus))}>
                      {workflow.validationStatus}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Cost/Run:</span>
                    <span className="text-white ml-2">{formatCost(workflow.estimatedCostPerRun)} OC</span>
                  </div>
                </div>

                {/* Detailed View */}
                {selectedWorkflow?.workflowId === workflow.workflowId && (
                  <div className="mt-6 pt-6 border-t border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Resource Estimates */}
                      <div>
                        <h5 className="text-white font-medium mb-3">Resource Estimates</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">CPU Cores:</span>
                            <span className="text-white">{workflow.resourceEstimate.cpuCores.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Memory:</span>
                            <span className="text-white">{workflow.resourceEstimate.memoryMb} MB</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">GPU Cores:</span>
                            <span className="text-white">{workflow.resourceEstimate.gpuCores.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Storage:</span>
                            <span className="text-white">{workflow.resourceEstimate.storageMb} MB</span>
                          </div>
                        </div>
                      </div>

                      {/* Cost Breakdown */}
                      <div>
                        <h5 className="text-white font-medium mb-3">Cost Breakdown</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Base Cost:</span>
                            <span className="text-white">{formatCost(workflow.costBreakdown.baseCost)} OC</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Complexity Cost:</span>
                            <span className="text-white">{formatCost(workflow.costBreakdown.complexityCost)} OC</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">AI Cost:</span>
                            <span className="text-white">{formatCost(workflow.costBreakdown.aiCost)} OC</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Integration Cost:</span>
                            <span className="text-white">{formatCost(workflow.costBreakdown.integrationCost)} OC</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Usage Stats */}
                    {workflow.actualRunsCount > 0 && (
                      <div className="mt-6">
                        <h5 className="text-white font-medium mb-3">Usage Statistics</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-slate-400">Total Runs:</span>
                            <span className="text-white ml-2">{workflow.actualRunsCount}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Avg Actual Cost:</span>
                            <span className="text-white ml-2">{formatCost(workflow.averageActualCost)} OC</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Prediction Accuracy:</span>
                            <span className="text-white ml-2">{(workflow.costPredictionAccuracy * 100).toFixed(1)}%</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Last Run:</span>
                            <span className="text-white ml-2">
                              {workflow.lastRunAt ? new Date(workflow.lastRunAt).toLocaleDateString() : 'Never'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Validation Issues */}
                    {(workflow.validationWarnings.length > 0 || workflow.validationErrors.length > 0 || workflow.securityIssues.length > 0) && (
                      <div className="mt-6">
                        <h5 className="text-white font-medium mb-3">Issues & Warnings</h5>
                        <div className="space-y-2">
                          {workflow.validationErrors.map((error, index) => (
                            <div key={index} className="bg-red-500/10 border border-red-500/20 rounded p-3">
                              <span className="text-red-400 text-sm">Error: {error}</span>
                            </div>
                          ))}
                          {workflow.validationWarnings.map((warning, index) => (
                            <div key={index} className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3">
                              <span className="text-yellow-400 text-sm">Warning: {warning}</span>
                            </div>
                          ))}
                          {workflow.securityIssues.map((issue, index) => (
                            <div key={index} className="bg-red-500/10 border border-red-500/20 rounded p-3">
                              <span className="text-red-400 text-sm">Security: {issue}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}