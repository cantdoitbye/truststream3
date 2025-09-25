import { useState, useEffect } from 'react';
import { multiCloudAPI } from '@/lib/api';

export interface MultiCloudDeployment {
  id: string;
  deployment_name: string;
  deployment_type: 'application' | 'service' | 'infrastructure' | 'data';
  status: 'planning' | 'deploying' | 'running' | 'scaling' | 'failed' | 'terminated';
  primary_cloud: string;
  secondary_clouds: string[];
  deployment_config: Record<string, any>;
  cost_optimization_enabled: boolean;
  performance_metrics: Record<string, any>;
  created_at: string;
}

export interface MultiCloudSummary {
  total_deployments: number;
  running_deployments: number;
  scaling_deployments: number;
  failed_deployments: number;
  cloud_distribution: Record<string, number>;
  cost_optimization_enabled: number;
  average_cost_reduction: number;
  deployment_types: string[];
}

export function useMultiCloud() {
  const [summary, setSummary] = useState<MultiCloudSummary | null>(null);
  const [deployments, setDeployments] = useState<MultiCloudDeployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMultiCloudData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch deployments and workloads
      const [deploymentsResponse, workloadsResponse] = await Promise.all([
        multiCloudAPI.getDeployments(),
        multiCloudAPI.getWorkloads()
      ]);
      
      if (deploymentsResponse.success && deploymentsResponse.data) {
        const data = deploymentsResponse.data as any;
        
        // Handle the data structure from the backend
        if (data.summary) {
          setSummary(data.summary as MultiCloudSummary);
        }
        
        if (data.deployments) {
          setDeployments(data.deployments as MultiCloudDeployment[]);
        } else if (Array.isArray(data)) {
          setDeployments(data as MultiCloudDeployment[]);
        }
        
        // If workloads response has additional deployment data, merge it
        if (workloadsResponse.success && workloadsResponse.data) {
          const workloadsData = workloadsResponse.data as any;
          if (Array.isArray(workloadsData)) {
            setDeployments(prev => [...prev, ...(workloadsData as MultiCloudDeployment[])]);
          }
        }
      } else {
        throw new Error(deploymentsResponse.error?.message || 'Failed to fetch multi-cloud data');
      }
    } catch (err) {
      console.error('Error fetching multi-cloud data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch multi-cloud data');
    } finally {
      setLoading(false);
    }
  };

  const createDeployment = async (deploymentData: {
    deployment_name: string;
    deployment_type: string;
    primary_cloud: string;
    secondary_clouds?: string[];
    deployment_config: Record<string, any>;
    cost_optimization_enabled?: boolean;
  }) => {
    try {
      const response = await multiCloudAPI.createDeployment({
        deployment_config: deploymentData.deployment_config,
        target_clouds: [deploymentData.primary_cloud, ...(deploymentData.secondary_clouds || [])],
        failover_config: {
          enabled: true,
          secondary_clouds: deploymentData.secondary_clouds || []
        },
        cost_optimization: deploymentData.cost_optimization_enabled || false
      });
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create multi-cloud deployment');
      }
      
      // Refresh data after creating deployment
      await fetchMultiCloudData();
      
      return response;
    } catch (err) {
      console.error('Error creating multi-cloud deployment:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchMultiCloudData();
    
    // Set up polling every 25 seconds
    const interval = setInterval(fetchMultiCloudData, 25000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    summary,
    deployments,
    loading,
    error,
    createDeployment,
    refetch: fetchMultiCloudData
  };
}