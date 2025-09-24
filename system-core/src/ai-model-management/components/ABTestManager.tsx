/**
 * A/B Test Manager Component
 * Create, manage, and analyze A/B tests for model comparisons
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
  Play, 
  Pause, 
  Square, 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock,
  Target,
  RefreshCw,
  Plus,
  MoreVertical
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

import { ABTest, ABTestResult, ModelDeployment, ModelComparisonResult } from '../types';

interface ABTestManagerProps {
  onTestUpdate?: (test: ABTest) => void;
}

export const ABTestManager: React.FC<ABTestManagerProps> = ({
  onTestUpdate
}) => {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [deployments, setDeployments] = useState<ModelDeployment[]>([]);
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);
  const [testResults, setTestResults] = useState<ModelComparisonResult | null>(null);
  const [showNewTestDialog, setShowNewTestDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newTestForm, setNewTestForm] = useState({
    test_name: '',
    description: '',
    model_a_deployment_id: '',
    model_b_deployment_id: '',
    traffic_split_percentage: '50',
    minimum_sample_size: '1000',
    test_duration_hours: '168', // 1 week
    test_criteria: '{}',
    success_metrics: '{}'
  });

  useEffect(() => {
    loadTests();
    loadDeployments();
  }, []);

  const loadTests = async () => {
    try {
      setIsLoading(true);
      
      // Mock data - replace with actual API call
      const mockTests: ABTest[] = [
        {
          id: 'test-1',
          test_name: 'GPT-4 vs Claude-3 Performance',
          description: 'Comparing response quality and latency between GPT-4 and Claude-3',
          model_a_deployment_id: 'dep-1',
          model_b_deployment_id: 'dep-2',
          traffic_split_percentage: 50,
          test_criteria: {
            primary_metric: 'response_quality',
            secondary_metrics: ['latency', 'cost']
          },
          success_metrics: {
            quality_threshold: 4.0,
            latency_threshold: 200,
            cost_threshold: 0.01
          },
          statistical_significance_threshold: 0.05,
          minimum_sample_size: 1000,
          test_duration_hours: 168,
          status: 'running',
          preliminary_results: {
            samples_collected: 756,
            early_winner: 'A'
          },
          final_results: {},
          started_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
          created_by: 'user-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'test-2',
          test_name: 'Optimized vs Standard Model',
          description: 'Testing performance impact of model optimization',
          model_a_deployment_id: 'dep-3',
          model_b_deployment_id: 'dep-4',
          traffic_split_percentage: 30,
          test_criteria: {
            primary_metric: 'latency',
            secondary_metrics: ['accuracy', 'cost']
          },
          success_metrics: {
            latency_improvement: 0.2,
            accuracy_threshold: 0.95
          },
          statistical_significance_threshold: 0.05,
          minimum_sample_size: 500,
          test_duration_hours: 72,
          status: 'completed',
          preliminary_results: {},
          final_results: {
            winner: 'A',
            confidence_level: 0.98,
            improvement_percentage: 25
          },
          started_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          completed_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          winner_model_id: 'dep-3',
          confidence_level: 0.98,
          created_by: 'user-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      setTests(mockTests);
    } catch (error) {
      console.error('Failed to load A/B tests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDeployments = async () => {
    try {
      // Mock deployments data
      const mockDeployments: ModelDeployment[] = [
        {
          id: 'dep-1',
          deployment_name: 'gpt-4-turbo-prod',
          environment: 'production',
          status: 'healthy'
        },
        {
          id: 'dep-2',
          deployment_name: 'claude-3-prod',
          environment: 'production',
          status: 'healthy'
        },
        {
          id: 'dep-3',
          deployment_name: 'optimized-model-v2',
          environment: 'production',
          status: 'healthy'
        },
        {
          id: 'dep-4',
          deployment_name: 'standard-model-v1',
          environment: 'production',
          status: 'healthy'
        }
      ] as ModelDeployment[];
      
      setDeployments(mockDeployments);
    } catch (error) {
      console.error('Failed to load deployments:', error);
    }
  };

  const handleCreateTest = async () => {
    try {
      const testCriteria = JSON.parse(newTestForm.test_criteria || '{}');
      const successMetrics = JSON.parse(newTestForm.success_metrics || '{}');
      
      // In real implementation, call AIModelManagementService
      console.log('Creating A/B test:', {
        ...newTestForm,
        test_criteria: testCriteria,
        success_metrics: successMetrics
      });
      
      setShowNewTestDialog(false);
      setNewTestForm({
        test_name: '',
        description: '',
        model_a_deployment_id: '',
        model_b_deployment_id: '',
        traffic_split_percentage: '50',
        minimum_sample_size: '1000',
        test_duration_hours: '168',
        test_criteria: '{}',
        success_metrics: '{}'
      });
      
      await loadTests();
    } catch (error) {
      console.error('Failed to create A/B test:', error);
    }
  };

  const handleTestAction = async (test: ABTest, action: string) => {
    try {
      switch (action) {
        case 'start':
          console.log('Starting test:', test.id);
          break;
        case 'pause':
          console.log('Pausing test:', test.id);
          break;
        case 'stop':
          console.log('Stopping test:', test.id);
          break;
        case 'analyze':
          await loadTestResults(test.id);
          setSelectedTest(test);
          break;
      }
      
      await loadTests();
    } catch (error) {
      console.error(`Failed to ${action} test:`, error);
    }
  };

  const loadTestResults = async (testId: string) => {
    try {
      // Mock test results data
      const mockResults: ModelComparisonResult = {
        model_a: {
          deployment_id: 'dep-1',
          metrics: {
            latency_avg: 145,
            latency_p95: 280,
            latency_p99: 450,
            throughput: 85,
            error_rate: 0.008,
            accuracy: 4.2,
            cost_per_request: 0.0012,
            user_satisfaction: 4.1,
            uptime_percentage: 99.2
          },
          sample_size: 756
        },
        model_b: {
          deployment_id: 'dep-2',
          metrics: {
            latency_avg: 165,
            latency_p95: 320,
            latency_p99: 480,
            throughput: 78,
            error_rate: 0.012,
            accuracy: 4.0,
            cost_per_request: 0.0015,
            user_satisfaction: 3.9,
            uptime_percentage: 98.8
          },
          sample_size: 744
        },
        statistical_significance: {
          is_significant: true,
          confidence_level: 0.95,
          p_value: 0.032
        },
        winner: 'A',
        recommendations: [
          'Model A shows significantly better latency performance',
          'Model A has lower error rate and better user satisfaction',
          'Consider deploying Model A to 100% of traffic'
        ]
      };
      
      setTestResults(mockResults);
    } catch (error) {
      console.error('Failed to load test results:', error);
    }
  };

  const getStatusBadgeVariant = (status: ABTest['status']) => {
    switch (status) {
      case 'running': return 'default';
      case 'completed': return 'secondary';
      case 'paused': return 'outline';
      case 'terminated': return 'destructive';
      default: return 'secondary';
    }
  };

  const calculateProgress = (test: ABTest) => {
    if (test.status === 'completed') return 100;
    if (test.status !== 'running') return 0;
    
    const samplesCollected = test.preliminary_results?.samples_collected || 0;
    return Math.min(100, (samplesCollected / test.minimum_sample_size) * 100);
  };

  const prepareComparisonChartData = () => {
    if (!testResults) return [];
    
    return [
      {
        metric: 'Latency (ms)',
        modelA: testResults.model_a.metrics.latency_avg,
        modelB: testResults.model_b.metrics.latency_avg
      },
      {
        metric: 'Throughput (req/s)',
        modelA: testResults.model_a.metrics.throughput,
        modelB: testResults.model_b.metrics.throughput
      },
      {
        metric: 'Error Rate (%)',
        modelA: testResults.model_a.metrics.error_rate * 100,
        modelB: testResults.model_b.metrics.error_rate * 100
      },
      {
        metric: 'User Satisfaction',
        modelA: testResults.model_a.metrics.user_satisfaction || 0,
        modelB: testResults.model_b.metrics.user_satisfaction || 0
      }
    ];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin h-8 w-8" />
        <span className="ml-2">Loading A/B tests...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">A/B Testing</h2>
          <p className="text-muted-foreground">
            Compare model performance and make data-driven deployment decisions
          </p>
        </div>
        <Dialog open={showNewTestDialog} onOpenChange={setShowNewTestDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New A/B Test
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create A/B Test</DialogTitle>
              <DialogDescription>
                Set up a new A/B test to compare model performance
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="test_name">Test Name</Label>
                  <Input
                    id="test_name"
                    value={newTestForm.test_name}
                    onChange={(e) => setNewTestForm(prev => ({ ...prev, test_name: e.target.value }))}
                    placeholder="e.g., GPT-4 vs Claude Performance"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="traffic_split">Traffic Split (%)</Label>
                  <Input
                    id="traffic_split"
                    type="number"
                    min="1"
                    max="99"
                    value={newTestForm.traffic_split_percentage}
                    onChange={(e) => setNewTestForm(prev => ({ ...prev, traffic_split_percentage: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTestForm.description}
                  onChange={(e) => setNewTestForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what you're testing and why"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model_a">Model A (Control)</Label>
                  <Select 
                    value={newTestForm.model_a_deployment_id} 
                    onValueChange={(value) => setNewTestForm(prev => ({ ...prev, model_a_deployment_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Model A" />
                    </SelectTrigger>
                    <SelectContent>
                      {deployments.filter(d => d.status === 'healthy').map(deployment => (
                        <SelectItem key={deployment.id} value={deployment.id}>
                          {deployment.deployment_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="model_b">Model B (Variant)</Label>
                  <Select 
                    value={newTestForm.model_b_deployment_id} 
                    onValueChange={(value) => setNewTestForm(prev => ({ ...prev, model_b_deployment_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Model B" />
                    </SelectTrigger>
                    <SelectContent>
                      {deployments.filter(d => d.status === 'healthy' && d.id !== newTestForm.model_a_deployment_id).map(deployment => (
                        <SelectItem key={deployment.id} value={deployment.id}>
                          {deployment.deployment_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sample_size">Minimum Sample Size</Label>
                  <Input
                    id="sample_size"
                    type="number"
                    value={newTestForm.minimum_sample_size}
                    onChange={(e) => setNewTestForm(prev => ({ ...prev, minimum_sample_size: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (hours)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={newTestForm.test_duration_hours}
                    onChange={(e) => setNewTestForm(prev => ({ ...prev, test_duration_hours: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowNewTestDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateTest}
                  disabled={!newTestForm.test_name || !newTestForm.model_a_deployment_id || !newTestForm.model_b_deployment_id}
                >
                  Create Test
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active A/B Tests</CardTitle>
          <CardDescription>
            Monitor ongoing and completed A/B tests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test Name</TableHead>
                <TableHead>Models</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Winner</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map((test) => {
                const modelA = deployments.find(d => d.id === test.model_a_deployment_id);
                const modelB = deployments.find(d => d.id === test.model_b_deployment_id);
                const progress = calculateProgress(test);
                
                return (
                  <TableRow key={test.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{test.test_name}</div>
                        <div className="text-sm text-muted-foreground">{test.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>A: {modelA?.deployment_name || 'Unknown'}</div>
                        <div>B: {modelB?.deployment_name || 'Unknown'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(test.status)}>
                        {test.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Progress value={progress} className="w-20" />
                        <span className="text-sm">{progress.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {test.started_at 
                        ? `${Math.floor((Date.now() - new Date(test.started_at).getTime()) / (1000 * 60 * 60))}h`
                        : 'Not started'
                      }
                    </TableCell>
                    <TableCell>
                      {test.winner_model_id ? (
                        <Badge variant="secondary">
                          Model {test.winner_model_id === test.model_a_deployment_id ? 'A' : 'B'}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">TBD</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {test.status === 'draft' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleTestAction(test, 'start')}
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                        )}
                        {test.status === 'running' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleTestAction(test, 'pause')}
                          >
                            <Pause className="h-3 w-3" />
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleTestAction(test, 'analyze')}
                        >
                          <BarChart3 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          {tests.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No A/B tests found.</p>
              <Button 
                variant="outline" 
                className="mt-2"
                onClick={() => setShowNewTestDialog(true)}
              >
                Create your first A/B test
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Results Analysis */}
      {selectedTest && testResults && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results: {selectedTest.test_name}</CardTitle>
            <CardDescription>
              Detailed analysis and comparison of model performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="metrics">Detailed Metrics</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                {/* Winner Announcement */}
                {testResults.winner && (
                  <Alert>
                    <Target className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Winner: Model {testResults.winner}</strong> with {((testResults.statistical_significance.confidence_level) * 100).toFixed(1)}% confidence
                      {testResults.statistical_significance.is_significant ? ' (Statistically significant)' : ' (Not statistically significant)'}
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Comparison Chart */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={prepareComparisonChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="metric" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="modelA" fill="#8884d8" name="Model A" />
                      <Bar dataKey="modelB" fill="#82ca9d" name="Model B" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
              
              <TabsContent value="metrics" className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Model A Metrics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Sample Size:</span>
                        <span>{testResults.model_a.sample_size.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Latency:</span>
                        <span>{testResults.model_a.metrics.latency_avg}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Error Rate:</span>
                        <span>{(testResults.model_a.metrics.error_rate * 100).toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Throughput:</span>
                        <span>{testResults.model_a.metrics.throughput} req/s</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cost per Request:</span>
                        <span>${testResults.model_a.metrics.cost_per_request.toFixed(4)}</span>
                      </div>
                      {testResults.model_a.metrics.user_satisfaction && (
                        <div className="flex justify-between">
                          <span>User Satisfaction:</span>
                          <span>{testResults.model_a.metrics.user_satisfaction.toFixed(1)}/5</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3">Model B Metrics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Sample Size:</span>
                        <span>{testResults.model_b.sample_size.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Latency:</span>
                        <span>{testResults.model_b.metrics.latency_avg}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Error Rate:</span>
                        <span>{(testResults.model_b.metrics.error_rate * 100).toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Throughput:</span>
                        <span>{testResults.model_b.metrics.throughput} req/s</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cost per Request:</span>
                        <span>${testResults.model_b.metrics.cost_per_request.toFixed(4)}</span>
                      </div>
                      {testResults.model_b.metrics.user_satisfaction && (
                        <div className="flex justify-between">
                          <span>User Satisfaction:</span>
                          <span>{testResults.model_b.metrics.user_satisfaction.toFixed(1)}/5</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Statistical Significance */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Statistical Analysis</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">P-value:</span>
                      <div className="font-medium">{testResults.statistical_significance.p_value.toFixed(4)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Confidence Level:</span>
                      <div className="font-medium">{(testResults.statistical_significance.confidence_level * 100).toFixed(1)}%</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Significance:</span>
                      <div className="font-medium">
                        {testResults.statistical_significance.is_significant ? 'Significant' : 'Not Significant'}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="recommendations" className="space-y-4">
                <div className="space-y-3">
                  {testResults.recommendations.map((recommendation, index) => (
                    <Alert key={index}>
                      <TrendingUp className="h-4 w-4" />
                      <AlertDescription>{recommendation}</AlertDescription>
                    </Alert>
                  ))}
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setSelectedTest(null)}>
                    Close
                  </Button>
                  {testResults.winner && (
                    <Button>
                      Deploy Winning Model
                    </Button>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
