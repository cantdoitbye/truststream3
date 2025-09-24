/**
 * Model Lifecycle View Component
 * Visualizes and manages model lifecycle stages
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  GitBranch, 
  PlayCircle, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle,
  ArrowRight,
  Plus,
  Settings,
  RefreshCw
} from 'lucide-react';

import { ModelLifecycle, AIModel } from '../types';

interface LifecycleViewProps {
  modelId?: string;
  onLifecycleUpdate?: (lifecycle: ModelLifecycle) => void;
}

export const ModelLifecycleView: React.FC<LifecycleViewProps> = ({
  modelId,
  onLifecycleUpdate
}) => {
  const [lifecycles, setLifecycles] = useState<ModelLifecycle[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(modelId || '');
  const [showNewLifecycleDialog, setShowNewLifecycleDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newLifecycleForm, setNewLifecycleForm] = useState({
    model_id: '',
    version_tag: '',
    lifecycle_stage: 'development',
    deployment_config: '{}',
    performance_requirements: '{}',
    resource_allocation: '{}'
  });

  useEffect(() => {
    loadModels();
    if (selectedModel) {
      loadLifecycles();
    }
  }, [selectedModel]);

  const loadModels = async () => {
    try {
      // Mock data - replace with actual API call
      const mockModels: AIModel[] = [
        {
          id: 'model-1',
          provider_id: 'provider-1',
          model_name: 'GPT-4 Turbo',
          model_version: '1.2.0',
          context_length: 128000,
          max_tokens: 4096,
          supports_functions: true,
          supports_vision: true,
          supports_streaming: true,
          cost_per_1k_input_tokens: 0.01,
          cost_per_1k_output_tokens: 0.03,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'model-2',
          provider_id: 'provider-2',
          model_name: 'Claude-3 Opus',
          model_version: '3.0.0',
          context_length: 200000,
          max_tokens: 4096,
          supports_functions: true,
          supports_vision: true,
          supports_streaming: true,
          cost_per_1k_input_tokens: 0.015,
          cost_per_1k_output_tokens: 0.075,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      setModels(mockModels);
      if (!selectedModel && mockModels.length > 0) {
        setSelectedModel(mockModels[0].id);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const loadLifecycles = async () => {
    try {
      setIsLoading(true);
      
      // Mock lifecycle data
      const mockLifecycles: ModelLifecycle[] = [
        {
          id: 'lc-1',
          model_id: selectedModel,
          lifecycle_stage: 'production',
          version_tag: 'v1.2.0',
          deployment_config: {
            environment: 'production',
            scaling: { min: 3, max: 10 },
            regions: ['us-east-1', 'eu-west-1']
          },
          performance_requirements: {
            latency_threshold: 200,
            availability_target: 99.9,
            throughput_target: 1000
          },
          resource_allocation: {
            cpu_cores: 8,
            memory_gb: 32,
            gpu_count: 2
          },
          approval_status: 'approved',
          approved_by: 'admin-1',
          approval_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          deployment_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          rollback_plan: {
            strategy: 'blue-green',
            rollback_triggers: ['error_rate > 5%', 'latency > 500ms']
          },
          monitoring_config: {
            metrics: ['latency', 'throughput', 'error_rate'],
            alert_thresholds: {
              latency: 200,
              error_rate: 0.01
            }
          },
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'lc-2',
          model_id: selectedModel,
          lifecycle_stage: 'staging',
          version_tag: 'v1.3.0-beta',
          deployment_config: {
            environment: 'staging',
            scaling: { min: 1, max: 3 }
          },
          performance_requirements: {
            latency_threshold: 300,
            availability_target: 99.0
          },
          resource_allocation: {
            cpu_cores: 4,
            memory_gb: 16,
            gpu_count: 1
          },
          approval_status: 'pending',
          rollback_plan: {},
          monitoring_config: {},
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'lc-3',
          model_id: selectedModel,
          lifecycle_stage: 'development',
          version_tag: 'v1.4.0-dev',
          deployment_config: {},
          performance_requirements: {},
          resource_allocation: {
            cpu_cores: 2,
            memory_gb: 8
          },
          approval_status: 'pending',
          rollback_plan: {},
          monitoring_config: {},
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      setLifecycles(mockLifecycles);
    } catch (error) {
      console.error('Failed to load lifecycles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLifecycle = async () => {
    try {
      const deploymentConfig = JSON.parse(newLifecycleForm.deployment_config || '{}');
      const performanceRequirements = JSON.parse(newLifecycleForm.performance_requirements || '{}');
      const resourceAllocation = JSON.parse(newLifecycleForm.resource_allocation || '{}');
      
      console.log('Creating lifecycle:', {
        ...newLifecycleForm,
        deployment_config: deploymentConfig,
        performance_requirements: performanceRequirements,
        resource_allocation: resourceAllocation
      });
      
      setShowNewLifecycleDialog(false);
      setNewLifecycleForm({
        model_id: '',
        version_tag: '',
        lifecycle_stage: 'development',
        deployment_config: '{}',
        performance_requirements: '{}',
        resource_allocation: '{}'
      });
      
      await loadLifecycles();
    } catch (error) {
      console.error('Failed to create lifecycle:', error);
    }
  };

  const handleLifecycleAction = async (lifecycle: ModelLifecycle, action: string) => {
    try {
      switch (action) {
        case 'promote':
          console.log('Promoting lifecycle:', lifecycle.id);
          break;
        case 'approve':
          console.log('Approving lifecycle:', lifecycle.id);
          break;
        case 'reject':
          console.log('Rejecting lifecycle:', lifecycle.id);
          break;
        case 'rollback':
          console.log('Rolling back lifecycle:', lifecycle.id);
          break;
        default:
          console.log(`Unknown action ${action} for lifecycle:`, lifecycle.id);
      }
      
      await loadLifecycles();
    } catch (error) {
      console.error(`Failed to ${action} lifecycle:`, error);
    }
  };

  const getStageIcon = (stage: ModelLifecycle['lifecycle_stage']) => {
    switch (stage) {
      case 'development':
        return <GitBranch className="h-4 w-4 text-blue-500" />;
      case 'testing':
        return <PlayCircle className="h-4 w-4 text-yellow-500" />;
      case 'staging':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'production':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'deprecated':
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      case 'archived':
        return <XCircle className="h-4 w-4 text-gray-400" />;
      case 'retired':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getApprovalIcon = (status: ModelLifecycle['approval_status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'conditional':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStageOrder = (stage: ModelLifecycle['lifecycle_stage']) => {
    const order = {
      development: 1,
      testing: 2,
      staging: 3,
      production: 4,
      deprecated: 5,
      archived: 6,
      retired: 7
    };
    return order[stage] || 0;
  };

  const getNextStage = (currentStage: ModelLifecycle['lifecycle_stage']) => {
    const transitions = {
      development: 'testing',
      testing: 'staging',
      staging: 'production',
      production: 'deprecated',
      deprecated: 'archived',
      archived: 'retired'
    };
    return transitions[currentStage] || null;
  };

  const selectedModelInfo = models.find(m => m.id === selectedModel);
  const sortedLifecycles = [...lifecycles].sort((a, b) => getStageOrder(b.lifecycle_stage) - getStageOrder(a.lifecycle_stage));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin h-8 w-8" />
        <span className="ml-2">Loading lifecycle data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Model Lifecycle</h2>
          <p className="text-muted-foreground">
            Track and manage your model versions through their lifecycle stages
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {models.map(model => (
                <SelectItem key={model.id} value={model.id}>
                  {model.model_name} v{model.model_version}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Dialog open={showNewLifecycleDialog} onOpenChange={setShowNewLifecycleDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Version
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Model Lifecycle</DialogTitle>
                <DialogDescription>
                  Start a new version lifecycle for your model
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="model_id">Model</Label>
                  <Select 
                    value={newLifecycleForm.model_id} 
                    onValueChange={(value) => setNewLifecycleForm(prev => ({ ...prev, model_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map(model => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.model_name} v{model.model_version}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="version_tag">Version Tag</Label>
                  <Input
                    id="version_tag"
                    value={newLifecycleForm.version_tag}
                    onChange={(e) => setNewLifecycleForm(prev => ({ ...prev, version_tag: e.target.value }))}
                    placeholder="e.g., v1.5.0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lifecycle_stage">Initial Stage</Label>
                  <Select 
                    value={newLifecycleForm.lifecycle_stage} 
                    onValueChange={(value) => setNewLifecycleForm(prev => ({ ...prev, lifecycle_stage: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="testing">Testing</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="performance_requirements">Performance Requirements (JSON)</Label>
                  <Textarea
                    id="performance_requirements"
                    value={newLifecycleForm.performance_requirements}
                    onChange={(e) => setNewLifecycleForm(prev => ({ ...prev, performance_requirements: e.target.value }))}
                    placeholder='{"latency_threshold": 200, "availability_target": 99.9}'
                  />
                </div>
                
                <Button onClick={handleCreateLifecycle} className="w-full">
                  Create Lifecycle
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Model Info */}
      {selectedModelInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>{selectedModelInfo.model_name}</span>
              <Badge variant="outline">v{selectedModelInfo.model_version}</Badge>
            </CardTitle>
            <CardDescription>
              Context Length: {selectedModelInfo.context_length.toLocaleString()} • 
              Max Tokens: {selectedModelInfo.max_tokens.toLocaleString()} • 
              Status: {selectedModelInfo.status}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Lifecycle Timeline */}
      {lifecycles.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Lifecycle Versions</h3>
              <p className="text-muted-foreground mb-4">
                Create your first model version to start managing its lifecycle.
              </p>
              <Button onClick={() => setShowNewLifecycleDialog(true)}>
                Create First Version
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedLifecycles.map((lifecycle, index) => {
            const nextStage = getNextStage(lifecycle.lifecycle_stage);
            const canPromote = nextStage && lifecycle.approval_status === 'approved';
            
            return (
              <Card key={lifecycle.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getStageIcon(lifecycle.lifecycle_stage)}
                      <div>
                        <CardTitle className="text-lg">{lifecycle.version_tag}</CardTitle>
                        <CardDescription>
                          {lifecycle.lifecycle_stage.charAt(0).toUpperCase() + lifecycle.lifecycle_stage.slice(1)} Stage
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        {getApprovalIcon(lifecycle.approval_status)}
                        <Badge 
                          variant={lifecycle.approval_status === 'approved' ? 'default' : 'outline'}
                        >
                          {lifecycle.approval_status.charAt(0).toUpperCase() + lifecycle.approval_status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {lifecycle.deployment_date && (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          Deployed on {new Date(lifecycle.deployment_date).toLocaleDateString()}
                          {lifecycle.approved_by && ` • Approved by ${lifecycle.approved_by}`}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <h4 className="font-semibold mb-2">Performance Requirements</h4>
                        <div className="text-muted-foreground space-y-1">
                          {Object.entries(lifecycle.performance_requirements).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span>{key.replace(/_/g, ' ')}:</span>
                              <span>{value as string}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-2">Resource Allocation</h4>
                        <div className="text-muted-foreground space-y-1">
                          {Object.entries(lifecycle.resource_allocation).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span>{key.replace(/_/g, ' ')}:</span>
                              <span>{value as string}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-2">Timeline</h4>
                        <div className="text-muted-foreground space-y-1">
                          <div>Created: {new Date(lifecycle.created_at).toLocaleDateString()}</div>
                          {lifecycle.approval_date && (
                            <div>Approved: {new Date(lifecycle.approval_date).toLocaleDateString()}</div>
                          )}
                          {lifecycle.deployment_date && (
                            <div>Deployed: {new Date(lifecycle.deployment_date).toLocaleDateString()}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2 pt-4 border-t">
                      {lifecycle.approval_status === 'pending' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleLifecycleAction(lifecycle, 'reject')}
                          >
                            Reject
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleLifecycleAction(lifecycle, 'approve')}
                          >
                            Approve
                          </Button>
                        </>
                      )}
                      
                      {canPromote && (
                        <Button 
                          size="sm"
                          onClick={() => handleLifecycleAction(lifecycle, 'promote')}
                        >
                          Promote to {nextStage}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      )}
                      
                      {lifecycle.lifecycle_stage === 'production' && lifecycle.deployment_date && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleLifecycleAction(lifecycle, 'rollback')}
                        >
                          Rollback
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ModelLifecycleView;