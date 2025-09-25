import { useState, useEffect } from 'react';
import { federatedLearningAPI } from '@/lib/api';

export interface FederatedLearningJob {
  id: string;
  job_name: string;
  job_type: 'horizontal' | 'vertical' | 'cross_device' | 'cross_silo';
  framework: 'flower' | 'tensorflow_federated' | 'unified';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  num_clients: number;
  num_rounds: number;
  current_round: number;
  privacy_budget: number;
  performance_metrics: Record<string, any>;
  created_at: string;
}

export interface FederatedLearningSummary {
  total_jobs: number;
  running_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  success_rate: string;
  frameworks_used: string[];
  job_types: string[];
}

export function useFederatedLearning() {
  const [summary, setSummary] = useState<FederatedLearningSummary | null>(null);
  const [jobs, setJobs] = useState<FederatedLearningJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFederatedLearningData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch both status data and sessions
      const [statusResponse, sessionsResponse] = await Promise.all([
        federatedLearningAPI.getStatus(),
        federatedLearningAPI.getSessions()
      ]);
      
      if (statusResponse.success && statusResponse.data) {
        // Handle the data structure from the backend
        const statusData = statusResponse.data as any;
        
        // Extract summary information
        if (statusData.summary) {
          setSummary(statusData.summary as FederatedLearningSummary);
        }
        
        // Extract jobs information
        if (statusData.jobs) {
          setJobs(statusData.jobs as FederatedLearningJob[]);
        } else if (sessionsResponse.success && sessionsResponse.data) {
          setJobs(sessionsResponse.data as FederatedLearningJob[]);
        }
      } else {
        throw new Error(statusResponse.error?.message || 'Failed to fetch federated learning data');
      }
    } catch (err) {
      console.error('Error fetching federated learning data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch federated learning data');
    } finally {
      setLoading(false);
    }
  };

  const createFederatedLearningJob = async (jobData: {
    job_name: string;
    job_type: string;
    framework: string;
    model_config: any;
    data_config: any;
    num_clients: number;
    num_rounds: number;
    privacy_budget?: number;
  }) => {
    try {
      const response = await federatedLearningAPI.createTrainingJob({
        model_config: jobData.model_config,
        data_config: jobData.data_config,
        num_clients: jobData.num_clients,
        num_rounds: jobData.num_rounds,
        privacy_budget: jobData.privacy_budget || 1.0,
        scenario_type: jobData.job_type as any
      });
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create job');
      }
      
      // Refresh data after creating job
      await fetchFederatedLearningData();
      
      return response;
    } catch (err) {
      console.error('Error creating federated learning job:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchFederatedLearningData();
    
    // Set up polling every 15 seconds for real-time updates
    const interval = setInterval(fetchFederatedLearningData, 15000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    summary,
    jobs,
    loading,
    error,
    createJob: createFederatedLearningJob,
    refetch: fetchFederatedLearningData
  };
}