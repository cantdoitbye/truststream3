import { useState, useEffect } from 'react';
import { systemAPI } from '@/lib/api';

export interface SystemStatus {
  version: string;
  timestamp: string;
  status: string;
  ai_governance: {
    total_agents: number;
    active_agents: number;
    average_success_rate: number;
    average_response_time_ms: number;
    average_trust_score: number;
    agents: Array<{
      id: string;
      agent_name: string;
      agent_type: string;
      status: string;
      trust_score: number;
      success_rate: number;
      response_time_ms: number;
      performance_metrics: Record<string, any>;
    }>;
  };
  system_metrics: {
    latest_metrics: Array<{
      metric_name: string;
      metric_value: number;
      metric_unit: string;
      tags: Record<string, any>;
    }>;
    performance_summary: {
      api_response_time: number;
      system_throughput: number;
      system_uptime: number;
      test_coverage: number;
    };
  };
  compliance: {
    total_frameworks: number;
    compliant_count: number;
    average_score: number;
    frameworks: Array<{
      compliance_framework: string;
      compliance_status: string;
      compliance_score: number;
      last_audit_date: string;
      next_audit_date: string;
    }>;
  };
  trust_scoring: {
    system_trust_score: number;
    trust_dimensions: {
      iq_score: number;
      appeal_score: number;
      social_score: number;
      humanity_score: number;
      overall_trust_score: number;
    };
  };
}

export function useSystemStatus() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSystemStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await systemAPI.getSystemStatus();
      
      if (response.success && response.data) {
        setSystemStatus(response.data as SystemStatus);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch system status');
      }
    } catch (err) {
      console.error('Error fetching system status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch system status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemStatus();
    
    // Set up polling every 30 seconds
    const interval = setInterval(fetchSystemStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    systemStatus,
    loading,
    error,
    refetch: fetchSystemStatus
  };
}