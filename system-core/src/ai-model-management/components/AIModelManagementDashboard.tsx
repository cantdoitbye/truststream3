/**
 * AI Model Management Dashboard - Main Component
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Plus, AlertTriangle, TrendingUp, Activity } from 'lucide-react';

import { ModelDeploymentManager } from './ModelDeploymentManager';
import { ModelPerformanceMonitor } from './ModelPerformanceMonitor';
import { ABTestManager } from './ABTestManager';
import { ModelOptimizationPanel } from './ModelOptimizationPanel';
import { ModelLifecycleView } from './ModelLifecycleView';
import { AIModelManagementService } from '../ai-model-management/AIModelManagementService';
import { ModelDeployment, ModelAlert, ModelMetrics } from '../ai-model-management/types';

interface DashboardStats {
  totalDeployments: number;
  healthyDeployments: number;
  activeABTests: number;
  alertCount: number;
  avgLatency: number;
  errorRate: number;
}

export const AIModelManagementDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<ModelAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Initialize model management service
  const modelService = AIModelManagementService.getInstance();

  useEffect(() => {
    loadDashboardData();
    
    // Set up real-time updates
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    
    // Listen for real-time events
    modelService.on('deployment_status_changed', handleDeploymentUpdate);
    modelService.on('alert_created', handleNewAlert);
    modelService.on('performance_metric_recorded', handleMetricUpdate);
    
    return () => {
      clearInterval(interval);
      modelService.removeAllListeners();
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load dashboard statistics
      const stats = await loadDashboardStats();
      setDashboardStats(stats);
      
      // Load recent alerts
      const alerts = await loadRecentAlerts();
      setRecentAlerts(alerts);
      
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDashboardStats = async (): Promise<DashboardStats> => {
    // Mock implementation - replace with actual service calls
    return {
      totalDeployments: 12,
      healthyDeployments: 10,
      activeABTests: 3,
      alertCount: 5,
      avgLatency: 145,
      errorRate: 0.008
    };
  };

  const loadRecentAlerts = async (): Promise<ModelAlert[]> => {
    // Mock implementation - replace with actual service calls
    return [
      {
        id: '1',
        deployment_id: 'dep-1',
        alert_type: 'performance_degradation',
        severity: 'warning',
        title: 'High Latency Detected',
        description: 'Model latency exceeded 200ms threshold',
        trigger_conditions: {},
        current_values: {},
        threshold_values: {},
        status: 'open',
        escalation_level: 1,
        triggered_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  };

  const handleDeploymentUpdate = (event: any) => {
    console.log('Deployment updated:', event);
    loadDashboardData();
  };

  const handleNewAlert = (event: any) => {
    console.log('New alert:', event);
    loadDashboardData();
  };

  const handleMetricUpdate = (event: any) => {
    console.log('Metric updated:', event);
    // Update real-time metrics without full reload
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  const getHealthStatus = (healthy: number, total: number) => {
    const percentage = (healthy / total) * 100;
    if (percentage >= 90) return { status: 'Healthy', color: 'bg-green-500' };
    if (percentage >= 70) return { status: 'Degraded', color: 'bg-yellow-500' };
    return { status: 'Critical', color: 'bg-red-500' };
  };

  if (isLoading && !dashboardStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin h-8 w-8" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  const healthStatus = dashboardStats ? getHealthStatus(dashboardStats.healthyDeployments, dashboardStats.totalDeployments) : null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Model Management</h1>
          <p className="text-muted-foreground">
            Monitor, deploy, and optimize your AI models
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </Badge>
          <Button onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deployments</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.totalDeployments}</div>
              <div className="flex items-center mt-2">
                <div className={`w-2 h-2 rounded-full mr-2 ${healthStatus?.color}`}></div>
                <p className="text-xs text-muted-foreground">
                  {dashboardStats.healthyDeployments} healthy, {healthStatus?.status}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">A/B Tests</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.activeABTests}</div>
              <p className="text-xs text-muted-foreground">Active experiments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.avgLatency}ms</div>
              <p className="text-xs text-muted-foreground">
                {dashboardStats.avgLatency < 200 ? 'Optimal' : 'Needs attention'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(dashboardStats.errorRate * 100).toFixed(2)}%</div>
              <p className="text-xs text-muted-foreground">
                {dashboardStats.errorRate < 0.01 ? 'Good' : 'High'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Alerts */}
      {recentAlerts.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {recentAlerts.length} active alert(s). 
            Latest: {recentAlerts[0].title} ({recentAlerts[0].severity})
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deployments">Deployments</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="ab-testing">A/B Testing</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ModelLifecycleView />
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest deployments and optimizations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">GPT-4 Model v1.2 deployed</span>
                    <Badge variant="secondary">2h ago</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">A/B test started: Claude vs GPT</span>
                    <Badge variant="secondary">4h ago</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">Optimization applied: Scaling</span>
                    <Badge variant="secondary">6h ago</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="deployments">
          <ModelDeploymentManager />
        </TabsContent>

        <TabsContent value="monitoring">
          <ModelPerformanceMonitor />
        </TabsContent>

        <TabsContent value="ab-testing">
          <ABTestManager />
        </TabsContent>

        <TabsContent value="optimization">
          <ModelOptimizationPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};
