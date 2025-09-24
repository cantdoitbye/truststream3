/**
 * Model Optimization Panel Component
 * Provides optimization recommendations and fine-tuning management
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Zap, 
  Brain, 
  TrendingUp, 
  Settings, 
  PlayCircle,
  StopCircle,
  RefreshCw,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';

import { 
  OptimizationRecommendation, 
  FineTuningJob, 
  ModelDeployment, 
  ModelOptimizationSuggestion,
  FineTuningOptions 
} from '../types';

interface OptimizationPanelProps {
  deploymentId?: string;
  onOptimizationUpdate?: (recommendation: OptimizationRecommendation) => void;
}

export const ModelOptimizationPanel: React.FC<OptimizationPanelProps> = ({
  deploymentId,
  onOptimizationUpdate
}) => {
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([]);
  const [fineTuningJobs, setFineTuningJobs] = useState<FineTuningJob[]>([]);
  const [deployments, setDeployments] = useState<ModelDeployment[]>([]);
  const [selectedDeployment, setSelectedDeployment] = useState<string>(deploymentId || '');
  const [showNewJobDialog, setShowNewJobDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newJobForm, setNewJobForm] = useState({
    job_name: '',
    base_model_id: '',
    training_dataset_id: '',
    validation_dataset_id: '',
    fine_tuning_objective: '',
    learning_rate: '0.0001',
    batch_size: '32',
    epochs: '10'
  });

  useEffect(() => {
    loadDeployments();
    if (selectedDeployment) {
      loadRecommendations();
      loadFineTuningJobs();
    }
  }, [selectedDeployment]);

  const loadDeployments = async () => {
    try {
      // Mock data - replace with actual API call
      const mockDeployments: ModelDeployment[] = [
        {
          id: 'dep-1',
          deployment_name: 'gpt-4-turbo-prod',
          environment: 'production',
          status: 'healthy'
        },
        {
          id: 'dep-2',
          deployment_name: 'claude-3-staging',
          environment: 'staging',
          status: 'healthy'
        }
      ] as ModelDeployment[];
      
      setDeployments(mockDeployments);
      if (!selectedDeployment && mockDeployments.length > 0) {
        setSelectedDeployment(mockDeployments[0].id);
      }
    } catch (error) {
      console.error('Failed to load deployments:', error);
    }
  };

  const loadRecommendations = async () => {
    try {
      setIsLoading(true);
      
      // Mock recommendations data
      const mockRecommendations: OptimizationRecommendation[] = [
        {
          id: 'rec-1',
          deployment_id: selectedDeployment,
          recommendation_type: 'performance',
          priority: 'high',
          recommendation_title: 'Optimize Model Quantization',
          recommendation_description: 'Implement 8-bit quantization to reduce model size and improve inference speed by 40%',
          implementation_steps: {
            steps: [
              'Analyze current model precision requirements',
              'Apply post-training quantization',
              'Test quantized model performance',
              'Deploy and monitor'
            ]
          },
          expected_impact: {
            latency_improvement: '40%',
            memory_reduction: '50%',
            accuracy_loss: '<2%'
          },
          estimated_effort: '2-3 days',
          risk_assessment: {
            level: 'medium',
            factors: ['Potential accuracy degradation', 'Need for performance validation']
          },
          status: 'open',
          auto_generated: true,
          confidence_score: 0.85,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'rec-2',
          deployment_id: selectedDeployment,
          recommendation_type: 'cost',
          priority: 'medium',
          recommendation_title: 'Implement Dynamic Scaling',
          recommendation_description: 'Configure auto-scaling based on request patterns to reduce costs during low-traffic periods',
          implementation_steps: {
            steps: [
              'Analyze traffic patterns',
              'Configure auto-scaling policies',
              'Set up monitoring alerts',
              'Test scaling behavior'
            ]
          },
          expected_impact: {
            cost_reduction: '30%',
            availability_improvement: '5%'
          },
          estimated_effort: '1-2 days',
          risk_assessment: {
            level: 'low',
            factors: ['Cold start latency during scale-up']
          },
          status: 'open',
          auto_generated: true,
          confidence_score: 0.92,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'rec-3',
          deployment_id: selectedDeployment,
          recommendation_type: 'accuracy',
          priority: 'high',
          recommendation_title: 'Fine-tune for Domain-Specific Tasks',
          recommendation_description: 'Fine-tune the model on domain-specific data to improve accuracy for specialized use cases',
          implementation_steps: {
            steps: [
              'Collect domain-specific training data',
              'Prepare fine-tuning dataset',
              'Configure fine-tuning parameters',
              'Execute fine-tuning job',
              'Evaluate and deploy improved model'
            ]
          },
          expected_impact: {
            accuracy_improvement: '15-20%',
            task_specific_performance: '25%'
          },
          estimated_effort: '1-2 weeks',
          risk_assessment: {
            level: 'medium',
            factors: ['Requires quality training data', 'Need for comprehensive evaluation']
          },
          status: 'open',
          auto_generated: false,
          confidence_score: 0.78,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      setRecommendations(mockRecommendations);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFineTuningJobs = async () => {
    try {
      // Mock fine-tuning jobs data
      const mockJobs: FineTuningJob[] = [
        {
          id: 'job-1',
          base_model_id: 'model-1',
          training_dataset_id: 'dataset-1',
          job_name: 'Domain-Specific Fine-tuning v2',
          fine_tuning_objective: 'Improve accuracy on technical documentation tasks',
          hyperparameters: {
            learning_rate: 0.0001,
            batch_size: 32,
            gradient_accumulation_steps: 4
          },
          training_config: {},
          optimization_strategy: 'adamw',
          learning_rate: 0.0001,
          batch_size: 32,
          epochs: 10,
          early_stopping_config: {},
          status: 'running',
          progress_percentage: 65,
          current_epoch: 7,
          best_validation_loss: 0.324,
          training_logs: {},
          resource_usage: {
            gpu_hours: 12.5,
            estimated_cost: 45.20
          },
          estimated_completion: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          started_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          created_by: 'user-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'job-2',
          base_model_id: 'model-1',
          training_dataset_id: 'dataset-2',
          job_name: 'Conversation Optimization',
          fine_tuning_objective: 'Optimize conversational responses',
          hyperparameters: {
            learning_rate: 0.00005,
            batch_size: 16
          },
          training_config: {},
          optimization_strategy: 'adam',
          learning_rate: 0.00005,
          batch_size: 16,
          epochs: 5,
          early_stopping_config: {},
          status: 'completed',
          progress_percentage: 100,
          current_epoch: 5,
          best_validation_loss: 0.298,
          training_logs: {},
          resource_usage: {
            gpu_hours: 8.2,
            total_cost: 32.80
          },
          started_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          completed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          output_model_path: '/models/fine-tuned/conversation-v2',
          created_by: 'user-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      setFineTuningJobs(mockJobs);
    } catch (error) {
      console.error('Failed to load fine-tuning jobs:', error);
    }
  };

  const handleImplementRecommendation = async (recommendation: OptimizationRecommendation) => {
    try {
      console.log('Implementing recommendation:', recommendation.id);
      // In real implementation, call AIModelManagementService
      
      await loadRecommendations();
    } catch (error) {
      console.error('Failed to implement recommendation:', error);
    }
  };

  const handleDismissRecommendation = async (recommendationId: string) => {
    try {
      console.log('Dismissing recommendation:', recommendationId);
      await loadRecommendations();
    } catch (error) {
      console.error('Failed to dismiss recommendation:', error);
    }
  };

  const handleCreateFineTuningJob = async () => {
    try {
      const fineTuningOptions: FineTuningOptions = {
        training_dataset_id: newJobForm.training_dataset_id,
        validation_dataset_id: newJobForm.validation_dataset_id || undefined,
        hyperparameters: {
          learning_rate: parseFloat(newJobForm.learning_rate),
          batch_size: parseInt(newJobForm.batch_size),
          epochs: parseInt(newJobForm.epochs)
        },
        optimization_strategy: 'adamw',
        learning_rate: parseFloat(newJobForm.learning_rate),
        batch_size: parseInt(newJobForm.batch_size),
        epochs: parseInt(newJobForm.epochs)
      };
      
      console.log('Creating fine-tuning job:', {
        ...newJobForm,
        options: fineTuningOptions
      });
      
      setShowNewJobDialog(false);
      setNewJobForm({
        job_name: '',
        base_model_id: '',
        training_dataset_id: '',
        validation_dataset_id: '',
        fine_tuning_objective: '',
        learning_rate: '0.0001',
        batch_size: '32',
        epochs: '10'
      });
      
      await loadFineTuningJobs();
    } catch (error) {
      console.error('Failed to create fine-tuning job:', error);
    }
  };

  const handleJobAction = async (job: FineTuningJob, action: string) => {
    try {
      switch (action) {
        case 'stop':
          console.log('Stopping fine-tuning job:', job.id);
          break;
        case 'restart':
          console.log('Restarting fine-tuning job:', job.id);
          break;
        default:
          console.log(`Unknown action ${action} for job:`, job.id);
      }
      
      await loadFineTuningJobs();
    } catch (error) {
      console.error(`Failed to ${action} fine-tuning job:`, error);
    }
  };

  const getPriorityColor = (priority: OptimizationRecommendation['priority']) => {
    switch (priority) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: FineTuningJob['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <StopCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin h-8 w-8" />
        <span className="ml-2">Loading optimization data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Model Optimization</h2>
          <p className="text-muted-foreground">
            AI-powered recommendations and fine-tuning management
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedDeployment} onValueChange={setSelectedDeployment}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select deployment" />
            </SelectTrigger>
            <SelectContent>
              {deployments.map(deployment => (
                <SelectItem key={deployment.id} value={deployment.id}>
                  {deployment.deployment_name} ({deployment.environment})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Dialog open={showNewJobDialog} onOpenChange={setShowNewJobDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Fine-tuning Job
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Fine-tuning Job</DialogTitle>
                <DialogDescription>
                  Start a new fine-tuning job to optimize your model
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="job_name">Job Name</Label>
                  <Input
                    id="job_name"
                    value={newJobForm.job_name}
                    onChange={(e) => setNewJobForm(prev => ({ ...prev, job_name: e.target.value }))}
                    placeholder="Enter job name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="base_model_id">Base Model</Label>
                  <Select 
                    value={newJobForm.base_model_id} 
                    onValueChange={(value) => setNewJobForm(prev => ({ ...prev, base_model_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select base model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="model-1">GPT-4 Turbo</SelectItem>
                      <SelectItem value="model-2">Claude-3</SelectItem>
                      <SelectItem value="model-3">Custom Model v1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="training_dataset_id">Training Dataset</Label>
                  <Select 
                    value={newJobForm.training_dataset_id} 
                    onValueChange={(value) => setNewJobForm(prev => ({ ...prev, training_dataset_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select training dataset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dataset-1">Technical Documentation</SelectItem>
                      <SelectItem value="dataset-2">Conversation Data</SelectItem>
                      <SelectItem value="dataset-3">Domain-Specific QA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fine_tuning_objective">Objective</Label>
                  <Textarea
                    id="fine_tuning_objective"
                    value={newJobForm.fine_tuning_objective}
                    onChange={(e) => setNewJobForm(prev => ({ ...prev, fine_tuning_objective: e.target.value }))}
                    placeholder="Describe the fine-tuning objective"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="learning_rate">Learning Rate</Label>
                    <Input
                      id="learning_rate"
                      type="number"
                      step="0.00001"
                      value={newJobForm.learning_rate}
                      onChange={(e) => setNewJobForm(prev => ({ ...prev, learning_rate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="batch_size">Batch Size</Label>
                    <Input
                      id="batch_size"
                      type="number"
                      value={newJobForm.batch_size}
                      onChange={(e) => setNewJobForm(prev => ({ ...prev, batch_size: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="epochs">Epochs</Label>
                    <Input
                      id="epochs"
                      type="number"
                      value={newJobForm.epochs}
                      onChange={(e) => setNewJobForm(prev => ({ ...prev, epochs: e.target.value }))}
                    />
                  </div>
                </div>
                
                <Button onClick={handleCreateFineTuningJob} className="w-full">
                  Create Fine-tuning Job
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="recommendations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="fine-tuning">Fine-tuning Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          {recommendations.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Recommendations Available</h3>
                  <p className="text-muted-foreground">
                    Our AI system is analyzing your model performance.
                    Recommendations will appear here when optimization opportunities are identified.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {recommendations.map(recommendation => (
                <Card key={recommendation.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 rounded-lg bg-blue-50">
                          {recommendation.recommendation_type === 'performance' && <Zap className="h-5 w-5 text-blue-600" />}
                          {recommendation.recommendation_type === 'cost' && <DollarSign className="h-5 w-5 text-green-600" />}
                          {recommendation.recommendation_type === 'accuracy' && <Brain className="h-5 w-5 text-purple-600" />}
                          {recommendation.recommendation_type === 'scaling' && <TrendingUp className="h-5 w-5 text-orange-600" />}
                          {recommendation.recommendation_type === 'security' && <AlertTriangle className="h-5 w-5 text-red-600" />}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{recommendation.recommendation_title}</CardTitle>
                          <CardDescription>{recommendation.recommendation_description}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant="outline" 
                          className={getPriorityColor(recommendation.priority)}
                        >
                          {recommendation.priority.toUpperCase()}
                        </Badge>
                        {recommendation.auto_generated && (
                          <Badge variant="secondary">AI Generated</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Expected Impact</h4>
                        <div className="text-sm text-muted-foreground">
                          {Object.entries(recommendation.expected_impact).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</span>
                              <span className="font-medium">{value as string}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Implementation Steps</h4>
                        <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                          {recommendation.implementation_steps.steps.map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ol>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-sm text-muted-foreground">
                          Estimated effort: {recommendation.estimated_effort} • 
                          Confidence: {Math.round((recommendation.confidence_score || 0) * 100)}%
                        </div>
                        <div className="space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDismissRecommendation(recommendation.id)}
                          >
                            Dismiss
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleImplementRecommendation(recommendation)}
                          >
                            Implement
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="fine-tuning" className="space-y-4">
          {fineTuningJobs.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Fine-tuning Jobs</h3>
                  <p className="text-muted-foreground mb-4">
                    Start fine-tuning your models to improve performance for specific tasks.
                  </p>
                  <Button onClick={() => setShowNewJobDialog(true)}>
                    Create First Job
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {fineTuningJobs.map(job => (
                <Card key={job.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        {getStatusIcon(job.status)}
                        <div>
                          <CardTitle className="text-lg">{job.job_name}</CardTitle>
                          <CardDescription>{job.fine_tuning_objective}</CardDescription>
                        </div>
                      </div>
                      <Badge 
                        variant={job.status === 'completed' ? 'default' : job.status === 'running' ? 'secondary' : 'outline'}
                      >
                        {job.status.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {job.status === 'running' && (
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Progress</span>
                            <span>{job.progress_percentage}%</span>
                          </div>
                          <Progress value={job.progress_percentage} className="h-2" />
                          <div className="text-sm text-muted-foreground mt-2">
                            Epoch {job.current_epoch} of {job.epochs} • 
                            Best validation loss: {job.best_validation_loss?.toFixed(3)}
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Learning Rate:</span>
                          <span className="ml-2 font-medium">{job.learning_rate}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Batch Size:</span>
                          <span className="ml-2 font-medium">{job.batch_size}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Strategy:</span>
                          <span className="ml-2 font-medium">{job.optimization_strategy}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <span className="ml-2 font-medium">{job.status}</span>
                        </div>
                      </div>
                      
                      {job.resource_usage && (
                        <div className="text-sm text-muted-foreground">
                          Resource usage: {job.resource_usage.gpu_hours?.toFixed(1)} GPU hours • 
                          Cost: ${job.resource_usage.estimated_cost?.toFixed(2) || job.resource_usage.total_cost?.toFixed(2)}
                        </div>
                      )}
                      
                      {job.status === 'running' && (
                        <div className="flex justify-end space-x-2 pt-2 border-t">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleJobAction(job, 'stop')}
                          >
                            <StopCircle className="h-4 w-4 mr-2" />
                            Stop
                          </Button>
                        </div>
                      )}
                      
                      {job.status === 'completed' && job.output_model_path && (
                        <Alert>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            Fine-tuning completed successfully. Model saved at: {job.output_model_path}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModelOptimizationPanel;