/**
 * Model Deployment Manager Component
 * Handles model deployment lifecycle and operations
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Pause, 
  Square, 
  RefreshCw, 
  Settings, 
  MoreVertical, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle
} from 'lucide-react';

import { ModelDeployment, DeploymentOptions, ModelLifecycle } from '../types';

interface DeploymentManagerProps {
  onDeploymentUpdate?: (deployment: ModelDeployment) => void;
}

export const ModelDeploymentManager: React.FC<DeploymentManagerProps> = ({
  onDeploymentUpdate
}) => {
  const [deployments, setDeployments] = useState<ModelDeployment[]>([]);
  const [lifecycles, setLifecycles] = useState<ModelLifecycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDeployment, setSelectedDeployment] = useState<ModelDeployment | null>(null);
  const [showNewDeploymentDialog, setShowNewDeploymentDialog] = useState(false);
  const [newDeploymentForm, setNewDeploymentForm] = useState<{
    lifecycle_id: string;
    environment: string;
    deployment_type: string;
    traffic_percentage: string;
  }>({ lifecycle_id: '', environment: 'staging', deployment_type: 'direct', traffic_percentage: '0' });

  useEffect(() => {
    loadDeployments();
    loadLifecycles();
  }, []);

  const loadDeployments = async () => {
    try {
      setIsLoading(true);
      // Mock data - replace with actual API call
      const mockDeployments: ModelDeployment[] = [
        {
          id: 'dep-1',
          lifecycle_id: 'lc-1',
          deployment_name: 'gpt-4-turbo-prod',
          environment: 'production',
          deployment_type: 'blue-green',
          endpoint_url: 'https://api.example.com/gpt-4-turbo',
          status: 'healthy',
          traffic_percentage: 100,
          load_balancer_config: {},
          scaling_config: { min_replicas: 3, max_replicas: 10 },
          security_config: {},
          deployment_metadata: { version: '1.2.0' },
          deployed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'dep-2',
          lifecycle_id: 'lc-2',
          deployment_name: 'claude-3-staging',
          environment: 'staging',
          deployment_type: 'canary',
          endpoint_url: 'https://staging.example.com/claude-3',
          status: 'deploying',
          traffic_percentage: 10,
          load_balancer_config: {},
          scaling_config: { min_replicas: 1, max_replicas: 5 },
          security_config: {},
          deployment_metadata: { version: '0.9.0' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      setDeployments(mockDeployments);
    } catch (error) {
      console.error('Failed to load deployments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLifecycles = async () => {
    try {
      // Mock data - replace with actual API call
      const mockLifecycles: ModelLifecycle[] = [
        {
          id: 'lc-1',
          model_id: 'model-1',
          lifecycle_stage: 'production',
          version_tag: 'v1.2.0',
          deployment_config: {},
          performance_requirements: {},
          resource_allocation: {},
          approval_status: 'approved',
          rollback_plan: {},
          monitoring_config: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'lc-2',
          model_id: 'model-2',
          lifecycle_stage: 'staging',
          version_tag: 'v0.9.0',
          deployment_config: {},
          performance_requirements: {},
          resource_allocation: {},
          approval_status: 'approved',
          rollback_plan: {},
          monitoring_config: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      setLifecycles(mockLifecycles);
    } catch (error) {
      console.error('Failed to load lifecycles:', error);
    }
  };

  const handleNewDeployment = async () => {
    try {
      const deploymentOptions: DeploymentOptions = {
        environment: newDeploymentForm.environment as any,
        deployment_type: newDeploymentForm.deployment_type as any,
        traffic_percentage: parseInt(newDeploymentForm.traffic_percentage),
        scaling_config: { min_replicas: 2, max_replicas: 8 },
        security_config: { enable_auth: true },
        monitoring_config: { enable_metrics: true }
      };

      // In real implementation, call AIModelManagementService
      // const result = await modelService.deployModel(newDeploymentForm.lifecycle_id, deploymentOptions);
      
      console.log('Deploying with options:', deploymentOptions);
      setShowNewDeploymentDialog(false);
      setNewDeploymentForm({ lifecycle_id: '', environment: 'staging', deployment_type: 'direct', traffic_percentage: '0' });
      
      // Reload deployments
      await loadDeployments();
    } catch (error) {
      console.error('Failed to deploy model:', error);
    }
  };

  const handleDeploymentAction = async (deployment: ModelDeployment, action: string) => {
    try {
      switch (action) {
        case 'stop':
          // await modelService.updateDeploymentStatus(deployment.id, 'terminated');
          console.log('Stopping deployment:', deployment.id);
          break;
        case 'restart':
          // await modelService.updateDeploymentStatus(deployment.id, 'deploying');
          console.log('Restarting deployment:', deployment.id);
          break;
        case 'rollback':
          // await modelService.rollbackDeployment(deployment.id, 'Manual rollback');
          console.log('Rolling back deployment:', deployment.id);
          break;
        case 'scale':
          console.log('Scaling deployment:', deployment.id);
          break;
      }
      
      await loadDeployments();
    } catch (error) {
      console.error(`Failed to ${action} deployment:`, error);
    }
  };

  const getStatusIcon = (status: ModelDeployment['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'deploying':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'unhealthy':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'terminated':
        return <Square className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: ModelDeployment['status']) => {
    switch (status) {
      case 'healthy': return 'default';
      case 'deploying': return 'secondary';
      case 'failed': return 'destructive';
      case 'unhealthy': return 'outline';
      case 'terminated': return 'secondary';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin h-8 w-8" />
        <span className="ml-2">Loading deployments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Model Deployments</h2>
          <p className="text-muted-foreground">
            Manage and monitor your model deployments across environments
          </p>
        </div>
        <Dialog open={showNewDeploymentDialog} onOpenChange={setShowNewDeploymentDialog}>
          <DialogTrigger asChild>
            <Button>
              <Play className="h-4 w-4 mr-2" />
              New Deployment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Deploy Model</DialogTitle>
              <DialogDescription>
                Deploy a model to a specific environment
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lifecycle">Model Lifecycle</Label>
                <Select 
                  value={newDeploymentForm.lifecycle_id} 
                  onValueChange={(value) => setNewDeploymentForm(prev => ({ ...prev, lifecycle_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select model lifecycle" />
                  </SelectTrigger>
                  <SelectContent>
                    {lifecycles.map(lifecycle => (
                      <SelectItem key={lifecycle.id} value={lifecycle.id}>
                        {lifecycle.version_tag} ({lifecycle.lifecycle_stage})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="environment">Environment</Label>
                <Select 
                  value={newDeploymentForm.environment} 
                  onValueChange={(value) => setNewDeploymentForm(prev => ({ ...prev, environment: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="testing">Testing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="deployment_type">Deployment Type</Label>
                <Select 
                  value={newDeploymentForm.deployment_type} 
                  onValueChange={(value) => setNewDeploymentForm(prev => ({ ...prev, deployment_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">Direct</SelectItem>
                    <SelectItem value="blue-green">Blue-Green</SelectItem>
                    <SelectItem value="canary">Canary</SelectItem>
                    <SelectItem value="rolling">Rolling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="traffic_percentage">Initial Traffic Percentage</Label>
                <Input
                  id="traffic_percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={newDeploymentForm.traffic_percentage}
                  onChange={(e) => setNewDeploymentForm(prev => ({ ...prev, traffic_percentage: e.target.value }))}
                  placeholder="0"
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowNewDeploymentDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleNewDeployment}
                  disabled={!newDeploymentForm.lifecycle_id}
                >
                  Deploy
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Deployments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Deployments</CardTitle>
          <CardDescription>
            Current model deployments and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Traffic</TableHead>
                <TableHead>Deployed</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deployments.map((deployment) => (
                <TableRow key={deployment.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(deployment.status)}
                      <span>{deployment.deployment_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{deployment.environment}</Badge>
                  </TableCell>
                  <TableCell>{deployment.deployment_type}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(deployment.status)}>
                      {deployment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Progress value={deployment.traffic_percentage} className="w-20" />
                      <span className="text-sm">{deployment.traffic_percentage}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {deployment.deployed_at 
                      ? new Date(deployment.deployed_at).toLocaleDateString()
                      : 'Not deployed'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {deployment.status === 'healthy' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeploymentAction(deployment, 'stop')}
                        >
                          <Pause className="h-3 w-3" />
                        </Button>
                      )}
                      {deployment.status === 'terminated' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeploymentAction(deployment, 'restart')}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeploymentAction(deployment, 'rollback')}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedDeployment(deployment)}
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {deployments.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No deployments found.</p>
              <Button 
                variant="outline" 
                className="mt-2"
                onClick={() => setShowNewDeploymentDialog(true)}
              >
                Create your first deployment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deployment Details */}
      {selectedDeployment && (
        <Card>
          <CardHeader>
            <CardTitle>Deployment Details: {selectedDeployment.deployment_name}</CardTitle>
            <CardDescription>
              Configuration and status information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Configuration</h4>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt>Environment:</dt>
                    <dd>{selectedDeployment.environment}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Type:</dt>
                    <dd>{selectedDeployment.deployment_type}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Traffic:</dt>
                    <dd>{selectedDeployment.traffic_percentage}%</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Endpoint:</dt>
                    <dd className="text-blue-600 hover:underline cursor-pointer">
                      {selectedDeployment.endpoint_url || 'Not available'}
                    </dd>
                  </div>
                </dl>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Scaling Configuration</h4>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt>Min Replicas:</dt>
                    <dd>{selectedDeployment.scaling_config?.min_replicas || 'Not set'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Max Replicas:</dt>
                    <dd>{selectedDeployment.scaling_config?.max_replicas || 'Not set'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Last Updated:</dt>
                    <dd>{new Date(selectedDeployment.updated_at).toLocaleString()}</dd>
                  </div>
                </dl>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setSelectedDeployment(null)}>
                Close
              </Button>
              <Button onClick={() => handleDeploymentAction(selectedDeployment, 'scale')}>
                Configure Scaling
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
