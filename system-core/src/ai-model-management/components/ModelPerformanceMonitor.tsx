/**
 * Model Performance Monitor Component
 * Real-time performance monitoring and metrics visualization
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertTriangle,
  Clock,
  DollarSign,
  Users,
  Zap
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

import { ModelDeployment, PerformanceMetric, ModelMetrics, ModelHealthStatus } from '../types';

interface PerformanceMonitorProps {
  deploymentId?: string;
}

export const ModelPerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  deploymentId
}) => {
  const [selectedDeployment, setSelectedDeployment] = useState<string>(deploymentId || '');
  const [deployments, setDeployments] = useState<ModelDeployment[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [healthStatus, setHealthStatus] = useState<ModelHealthStatus | null>(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadDeployments();
  }, []);

  useEffect(() => {
    if (selectedDeployment) {
      loadMetrics();
      loadHealthStatus();
      
      // Set up real-time updates
      const interval = setInterval(() => {
        loadMetrics();
        loadHealthStatus();
      }, 30000); // Update every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [selectedDeployment, timeRange]);

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
          status: 'deploying'
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

  const loadMetrics = async () => {
    try {
      setIsLoading(true);
      
      // Generate mock metrics data
      const mockMetrics = generateMockMetrics(timeRange);
      setMetrics(mockMetrics);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHealthStatus = async () => {
    try {
      if (!selectedDeployment) return;
      
      // Mock health status
      const mockHealth: ModelHealthStatus = {
        deployment_id: selectedDeployment,
        overall_health: 'healthy',
        health_score: 85,
        last_check: new Date().toISOString(),
        issues: [
          {
            type: 'latency_spike',
            severity: 'warning',
            message: 'Latency increased by 15% in the last hour',
            since: new Date(Date.now() - 60 * 60 * 1000).toISOString()
          }
        ],
        performance_summary: {
          latency_avg: 145,
          latency_p95: 280,
          latency_p99: 450,
          throughput: 85,
          error_rate: 0.008,
          cost_per_request: 0.0012,
          uptime_percentage: 99.2
        },
        resource_utilization: {
          cpu_percentage: 65,
          memory_percentage: 72,
          gpu_percentage: 58,
          storage_percentage: 45
        }
      };
      
      setHealthStatus(mockHealth);
    } catch (error) {
      console.error('Failed to load health status:', error);
    }
  };

  const generateMockMetrics = (timeRange: string): PerformanceMetric[] => {
    const now = new Date();
    const points = timeRange === '1h' ? 12 : timeRange === '24h' ? 24 : 7 * 24;
    const interval = timeRange === '1h' ? 5 * 60 * 1000 : timeRange === '24h' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    
    const metrics: PerformanceMetric[] = [];
    
    for (let i = points; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * interval).toISOString();
      
      // Generate latency metrics
      metrics.push({
        id: `${timestamp}-latency`,
        deployment_id: selectedDeployment,
        metric_type: 'latency',
        metric_value: 100 + Math.random() * 100 + Math.sin(i / 4) * 50,
        metric_unit: 'ms',
        measurement_context: {},
        benchmark_comparison: {},
        alert_threshold_breached: false,
        recorded_at: timestamp,
        aggregation_period: 'hourly'
      });
      
      // Generate throughput metrics
      metrics.push({
        id: `${timestamp}-throughput`,
        deployment_id: selectedDeployment,
        metric_type: 'throughput',
        metric_value: 50 + Math.random() * 50 + Math.cos(i / 6) * 20,
        metric_unit: 'requests/second',
        measurement_context: {},
        benchmark_comparison: {},
        alert_threshold_breached: false,
        recorded_at: timestamp,
        aggregation_period: 'hourly'
      });
      
      // Generate error rate metrics
      metrics.push({
        id: `${timestamp}-error_rate`,
        deployment_id: selectedDeployment,
        metric_type: 'error_rate',
        metric_value: Math.random() * 0.02,
        metric_unit: 'percentage',
        measurement_context: {},
        benchmark_comparison: {},
        alert_threshold_breached: false,
        recorded_at: timestamp,
        aggregation_period: 'hourly'
      });
      
      // Generate cost metrics
      metrics.push({
        id: `${timestamp}-cost`,
        deployment_id: selectedDeployment,
        metric_type: 'cost',
        metric_value: 0.001 + Math.random() * 0.002,
        metric_unit: 'usd',
        measurement_context: {},
        benchmark_comparison: {},
        alert_threshold_breached: false,
        recorded_at: timestamp,
        aggregation_period: 'hourly'
      });
    }
    
    return metrics;
  };

  const prepareChartData = (metricType: string) => {
    const filteredMetrics = metrics.filter(m => m.metric_type === metricType);
    return filteredMetrics.map(metric => ({
      timestamp: new Date(metric.recorded_at).toLocaleTimeString(),
      value: metric.metric_value,
      unit: metric.metric_unit
    }));
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatMetricValue = (value: number, unit: string) => {
    if (unit === 'percentage') {
      return `${(value * 100).toFixed(2)}%`;
    }
    if (unit === 'usd') {
      return `$${value.toFixed(4)}`;
    }
    if (unit === 'ms') {
      return `${value.toFixed(0)}ms`;
    }
    return `${value.toFixed(1)} ${unit}`;
  };

  const selectedDeploymentInfo = deployments.find(d => d.id === selectedDeployment);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Performance Monitoring</h2>
          <p className="text-muted-foreground">
            Real-time metrics and health monitoring for your model deployments
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
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={loadMetrics} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Health Status Overview */}
      {healthStatus && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Health Score</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{healthStatus.health_score}/100</div>
              <p className={`text-xs ${getHealthColor(healthStatus.overall_health)}`}>
                {healthStatus.overall_health.charAt(0).toUpperCase() + healthStatus.overall_health.slice(1)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{healthStatus.performance_summary.latency_avg}ms</div>
              <p className="text-xs text-muted-foreground">
                P95: {healthStatus.performance_summary.latency_p95}ms
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(healthStatus.performance_summary.error_rate * 100).toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {healthStatus.performance_summary.error_rate < 0.01 ? 'Excellent' : 'Needs attention'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {healthStatus.performance_summary.uptime_percentage.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Issues */}
      {healthStatus?.issues && healthStatus.issues.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {healthStatus.issues.length} active issue(s) detected. 
            Latest: {healthStatus.issues[0].message}
          </AlertDescription>
        </Alert>
      )}

      {/* Metrics Charts */}
      <Tabs defaultValue="latency" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="latency">Latency</TabsTrigger>
          <TabsTrigger value="throughput">Throughput</TabsTrigger>
          <TabsTrigger value="errors">Error Rate</TabsTrigger>
          <TabsTrigger value="cost">Cost</TabsTrigger>
        </TabsList>

        <TabsContent value="latency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Response Latency</CardTitle>
              <CardDescription>
                Model response time over the selected time period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={prepareChartData('latency')}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [`${value.toFixed(0)}ms`, 'Latency']} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    name="Latency (ms)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="throughput" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Request Throughput</CardTitle>
              <CardDescription>
                Requests processed per second
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={prepareChartData('throughput')}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [`${value.toFixed(1)}`, 'Requests/sec']} />
                  <Legend />
                  <Bar 
                    dataKey="value" 
                    fill="#82ca9d" 
                    name="Throughput (req/s)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Rate</CardTitle>
              <CardDescription>
                Percentage of requests that resulted in errors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={prepareChartData('error_rate')}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [`${(value * 100).toFixed(2)}%`, 'Error Rate']} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#ff7300" 
                    strokeWidth={2}
                    name="Error Rate (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cost" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost per Request</CardTitle>
              <CardDescription>
                Average cost per model inference request
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={prepareChartData('cost')}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [`$${value.toFixed(4)}`, 'Cost']} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#ffc658" 
                    strokeWidth={2}
                    name="Cost per Request ($)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Resource Utilization */}
      {healthStatus && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Resource Utilization</CardTitle>
              <CardDescription>
                Current resource usage across infrastructure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">CPU</span>
                  <span className="text-sm">{healthStatus.resource_utilization.cpu_percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${healthStatus.resource_utilization.cpu_percentage}%` }}
                  ></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Memory</span>
                  <span className="text-sm">{healthStatus.resource_utilization.memory_percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${healthStatus.resource_utilization.memory_percentage}%` }}
                  ></div>
                </div>
                
                {healthStatus.resource_utilization.gpu_percentage && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">GPU</span>
                      <span className="text-sm">{healthStatus.resource_utilization.gpu_percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${healthStatus.resource_utilization.gpu_percentage}%` }}
                      ></div>
                    </div>
                  </>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Storage</span>
                  <span className="text-sm">{healthStatus.resource_utilization.storage_percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-600 h-2 rounded-full" 
                    style={{ width: `${healthStatus.resource_utilization.storage_percentage}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Performance Summary</CardTitle>
              <CardDescription>
                Key performance indicators for the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Average Latency</span>
                  </div>
                  <span className="font-medium">{healthStatus.performance_summary.latency_avg}ms</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">P95 Latency</span>
                  </div>
                  <span className="font-medium">{healthStatus.performance_summary.latency_p95}ms</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Throughput</span>
                  </div>
                  <span className="font-medium">{healthStatus.performance_summary.throughput} req/s</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Cost per Request</span>
                  </div>
                  <span className="font-medium">${healthStatus.performance_summary.cost_per_request.toFixed(4)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Uptime</span>
                  </div>
                  <span className="font-medium">{healthStatus.performance_summary.uptime_percentage.toFixed(2)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
