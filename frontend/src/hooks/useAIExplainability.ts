import { useState, useEffect } from 'react';
import { explainabilityAPI } from '@/lib/api';

export interface ExplainabilityRequest {
  id: string;
  request_type: 'shap' | 'lime' | 'counterfactual' | 'feature_importance' | 'bias_audit';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  model_id: string;
  input_data: Record<string, any>;
  stakeholder_type: 'end_user' | 'technical_user' | 'business_user' | 'regulator';
  explanation_result: Record<string, any>;
  processing_time_ms: number;
  created_at: string;
}

export interface ExplainabilitySummary {
  total_requests: number;
  completed_requests: number;
  pending_requests: number;
  processing_requests: number;
  success_rate: string;
  average_processing_time_ms: number;
  request_types: Record<string, number>;
  stakeholder_types: Record<string, number>;
}

export function useAIExplainability() {
  const [summary, setSummary] = useState<ExplainabilitySummary | null>(null);
  const [requests, setRequests] = useState<ExplainabilityRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExplainabilityData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await explainabilityAPI.getExplanations();
      
      if (response.success && response.data) {
        const data = response.data as any;
        
        // Handle the data structure from the backend
        if (data.summary) {
          setSummary(data.summary as ExplainabilitySummary);
        }
        
        if (data.requests) {
          setRequests(data.requests as ExplainabilityRequest[]);
        } else if (Array.isArray(data)) {
          setRequests(data as ExplainabilityRequest[]);
        }
      } else {
        throw new Error(response.error?.message || 'Failed to fetch AI explainability data');
      }
    } catch (err) {
      console.error('Error fetching AI explainability data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch AI explainability data');
    } finally {
      setLoading(false);
    }
  };

  const createExplanationRequest = async (requestData: {
    request_type: string;
    model_id: string;
    input_data: Record<string, any>;
    stakeholder_type: string;
  }) => {
    try {
      const response = await explainabilityAPI.createExplanation({
        model_id: requestData.model_id,
        input_data: requestData.input_data,
        explanation_type: requestData.request_type,
        stakeholder_type: requestData.stakeholder_type,
        compliance_requirements: ['gdpr_article_22', 'eu_ai_act']
      });
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create explanation request');
      }
      
      // Refresh data after creating request
      await fetchExplainabilityData();
      
      return response;
    } catch (err) {
      console.error('Error creating explanation request:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchExplainabilityData();
    
    // Set up polling every 20 seconds
    const interval = setInterval(fetchExplainabilityData, 20000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    summary,
    requests,
    loading,
    error,
    createExplanation: createExplanationRequest,
    refetch: fetchExplainabilityData
  };
}