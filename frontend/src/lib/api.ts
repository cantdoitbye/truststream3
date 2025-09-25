/**
 * TrustStram v4.4 API Service
 * Connects to live backend at http://localhost:3000/api/v44/
 */

import {
  fallbackSystemStatus,
  fallbackFederatedLearning,
  fallbackExplainability,
  fallbackQuantumEncryption,
  fallbackMultiCloud,
  shouldUseFallbackData
} from './fallbackData';

// Check if we're in development or production
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const API_BASE_URL = isProduction ? '/api/v44' : 'http://localhost:3000/api/v44';

// Authentication token management
let authToken: string | null = null;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    version: string;
    timestamp: string;
    request_id: string;
  };
}

// Helper to get auth headers
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'API-Version': '4.4'
  };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  return headers;
}

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    // For production, append .json to GET requests for static files
    const isGetRequest = !options.method || options.method.toUpperCase() === 'GET';
    const url = isProduction && isGetRequest 
      ? `${API_BASE_URL}${endpoint}.json` 
      : `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    return {
      success: false,
      error: {
        code: 'API_REQUEST_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    };
  }
}

// Authentication functions
export const authAPI = {
  async login(email: string, password: string) {
    const response = await apiRequest<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    if (response.success && response.data?.token) {
      authToken = response.data.token;
      localStorage.setItem('truststream_token', authToken);
    }
    
    return response;
  },
  
  async logout() {
    const response = await apiRequest('/auth/logout', { method: 'POST' });
    authToken = null;
    localStorage.removeItem('truststream_token');
    return response;
  },
  
  async getCurrentUser() {
    return await apiRequest('/auth/user');
  },
  
  async register(email: string, password: string) {
    return await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },
  
  // Initialize auth token from localStorage
  initializeAuth() {
    const token = localStorage.getItem('truststream_token');
    if (token) {
      authToken = token;
    }
  }
};

// System status API
export const systemAPI = {
  async getSystemStatus() {
    // Use fallback data if backend is not available or in development mode
    if (shouldUseFallbackData()) {
      return {
        success: true,
        data: fallbackSystemStatus,
        metadata: {
          version: '4.4.0',
          timestamp: new Date().toISOString(),
          request_id: 'fallback-' + Date.now()
        }
      };
    }
    
    try {
      return await apiRequest('/status');
    } catch (error) {
      console.warn('Backend not available, using fallback data');
      return {
        success: true,
        data: fallbackSystemStatus,
        metadata: {
          version: '4.4.0',
          timestamp: new Date().toISOString(),
          request_id: 'fallback-' + Date.now()
        }
      };
    }
  },
  
  async getHealthCheck() {
    return await apiRequest('/health');
  },
  
  async getMetrics() {
    return await apiRequest('/metrics');
  }
};

// Federated Learning API
export const federatedLearningAPI = {
  async getStatus() {
    if (shouldUseFallbackData()) {
      return {
        success: true,
        data: fallbackFederatedLearning,
        metadata: {
          version: '4.4.0',
          timestamp: new Date().toISOString(),
          request_id: 'fallback-fl-' + Date.now()
        }
      };
    }
    
    try {
      return await apiRequest('/federated-learning/status');
    } catch (error) {
      console.warn('FL Backend not available, using fallback data');
      return {
        success: true,
        data: fallbackFederatedLearning,
        metadata: {
          version: '4.4.0',
          timestamp: new Date().toISOString(),
          request_id: 'fallback-fl-' + Date.now()
        }
      };
    }
  },
  
  async getSessions() {
    if (shouldUseFallbackData()) {
      return {
        success: true,
        data: fallbackFederatedLearning.jobs,
        metadata: {
          version: '4.4.0',
          timestamp: new Date().toISOString(),
          request_id: 'fallback-fl-sessions-' + Date.now()
        }
      };
    }
    
    try {
      return await apiRequest('/federated-learning/sessions');
    } catch (error) {
      return {
        success: true,
        data: fallbackFederatedLearning.jobs,
        metadata: {
          version: '4.4.0',
          timestamp: new Date().toISOString(),
          request_id: 'fallback-fl-sessions-' + Date.now()
        }
      };
    }
  },
  
  async createTrainingJob(jobConfig: any) {
    return await apiRequest('/federated-learning/train', {
      method: 'POST',
      body: JSON.stringify(jobConfig)
    });
  },
  
  async getJobStatus(jobId: string) {
    return await apiRequest(`/federated-learning/status/${jobId}`);
  },
  
  async getMetrics(jobId: string) {
    return await apiRequest(`/federated-learning/metrics/${jobId}`);
  }
};

// AI Explainability API
export const explainabilityAPI = {
  async getExplanations() {
    if (shouldUseFallbackData()) {
      return {
        success: true,
        data: fallbackExplainability,
        metadata: {
          version: '4.4.0',
          timestamp: new Date().toISOString(),
          request_id: 'fallback-exp-' + Date.now()
        }
      };
    }
    
    try {
      return await apiRequest('/explainability/explanations');
    } catch (error) {
      console.warn('Explainability Backend not available, using fallback data');
      return {
        success: true,
        data: fallbackExplainability,
        metadata: {
          version: '4.4.0',
          timestamp: new Date().toISOString(),
          request_id: 'fallback-exp-' + Date.now()
        }
      };
    }
  },
  
  async createExplanation(explanationData: any) {
    return await apiRequest('/explainability/explain', {
      method: 'POST',
      body: JSON.stringify(explanationData)
    });
  },
  
  async getExplanation(explanationId: string) {
    return await apiRequest(`/explainability/explanation/${explanationId}`);
  },
  
  async getBiasAudit(modelId: string) {
    return await apiRequest('/explainability/bias-audit', {
      method: 'POST',
      body: JSON.stringify({ model_id: modelId })
    });
  },
  
  async getAuditTrail(modelId: string) {
    return await apiRequest(`/explainability/audit-trail/${modelId}`);
  }
};

// Multi-Cloud Orchestration API
export const multiCloudAPI = {
  async getDeployments() {
    if (shouldUseFallbackData()) {
      return {
        success: true,
        data: fallbackMultiCloud,
        metadata: {
          version: '4.4.0',
          timestamp: new Date().toISOString(),
          request_id: 'fallback-mc-' + Date.now()
        }
      };
    }
    
    try {
      return await apiRequest('/multi-cloud/deployments');
    } catch (error) {
      console.warn('Multi-Cloud Backend not available, using fallback data');
      return {
        success: true,
        data: fallbackMultiCloud,
        metadata: {
          version: '4.4.0',
          timestamp: new Date().toISOString(),
          request_id: 'fallback-mc-' + Date.now()
        }
      };
    }
  },
  
  async createDeployment(deploymentConfig: any) {
    return await apiRequest('/multi-cloud/deploy', {
      method: 'POST',
      body: JSON.stringify(deploymentConfig)
    });
  },
  
  async getWorkloads() {
    if (shouldUseFallbackData()) {
      return {
        success: true,
        data: fallbackMultiCloud.deployments,
        metadata: {
          version: '4.4.0',
          timestamp: new Date().toISOString(),
          request_id: 'fallback-mc-workloads-' + Date.now()
        }
      };
    }
    
    try {
      return await apiRequest('/multi-cloud/workloads');
    } catch (error) {
      return {
        success: true,
        data: fallbackMultiCloud.deployments,
        metadata: {
          version: '4.4.0',
          timestamp: new Date().toISOString(),
          request_id: 'fallback-mc-workloads-' + Date.now()
        }
      };
    }
  },
  
  async scaleWorkload(workloadId: string, scaleConfig: any) {
    return await apiRequest(`/multi-cloud/workloads/${workloadId}/scale`, {
      method: 'PUT',
      body: JSON.stringify(scaleConfig)
    });
  },
  
  async getCostOptimization() {
    return await apiRequest('/multi-cloud/cost-optimization');
  },
  
  async triggerFailover(deploymentId: string) {
    return await apiRequest('/multi-cloud/failover', {
      method: 'POST',
      body: JSON.stringify({ deployment_id: deploymentId })
    });
  }
};

// Quantum Encryption API
export const quantumAPI = {
  async getOperations() {
    if (shouldUseFallbackData()) {
      return {
        success: true,
        data: fallbackQuantumEncryption,
        metadata: {
          version: '4.4.0',
          timestamp: new Date().toISOString(),
          request_id: 'fallback-quantum-' + Date.now()
        }
      };
    }
    
    try {
      return await apiRequest('/quantum-encryption/operations');
    } catch (error) {
      console.warn('Quantum Backend not available, using fallback data');
      return {
        success: true,
        data: fallbackQuantumEncryption,
        metadata: {
          version: '4.4.0',
          timestamp: new Date().toISOString(),
          request_id: 'fallback-quantum-' + Date.now()
        }
      };
    }
  },
  
  async encrypt(data: any, algorithm: string = 'ML-KEM-768') {
    return await apiRequest('/quantum-encryption/encrypt', {
      method: 'POST',
      body: JSON.stringify({ data, algorithm })
    });
  },
  
  async decrypt(encryptedData: any, keyId: string) {
    return await apiRequest('/quantum-encryption/decrypt', {
      method: 'POST',
      body: JSON.stringify({ data: encryptedData, key_id: keyId })
    });
  },
  
  async generateKey(algorithm: string = 'ML-KEM-768') {
    return await apiRequest('/quantum-encryption/key-generation', {
      method: 'POST',
      body: JSON.stringify({ algorithm })
    });
  },
  
  async sign(data: any, algorithm: string = 'ML-DSA-65') {
    return await apiRequest('/quantum-encryption/sign', {
      method: 'POST',
      body: JSON.stringify({ data, algorithm })
    });
  },
  
  async verify(data: any, signature: any, algorithm: string = 'ML-DSA-65') {
    return await apiRequest('/quantum-encryption/verify', {
      method: 'POST',
      body: JSON.stringify({ data, signature, algorithm })
    });
  }
};

// Governance API
export const governanceAPI = {
  async getGovernanceScore(projectId?: string) {
    const params = projectId ? `?project_id=${projectId}` : '';
    return await apiRequest(`/governance/score${params}`);
  },
  
  async getTrustAssessment(entityId: string) {
    return await apiRequest(`/governance/trust-assessment?entity_id=${entityId}`);
  },
  
  async getPolicies() {
    return await apiRequest('/governance/policies');
  },
  
  async updatePolicy(policyData: any) {
    return await apiRequest('/governance/policy', {
      method: 'POST',
      body: JSON.stringify(policyData)
    });
  },
  
  async createProposal(proposalData: any) {
    return await apiRequest('/governance/proposals', {
      method: 'POST',
      body: JSON.stringify(proposalData)
    });
  },
  
  async voteOnProposal(proposalId: string, vote: any) {
    return await apiRequest(`/governance/proposals/${proposalId}/vote`, {
      method: 'POST',
      body: JSON.stringify(vote)
    });
  }
};

// Monitoring & Analytics API
export const monitoringAPI = {
  async getPerformanceMetrics(timeRange: string = '1h', metrics: string = 'cpu,memory', aggregation: string = 'avg') {
    const params = new URLSearchParams({ time_range: timeRange, metrics, aggregation });
    return await apiRequest(`/monitoring/performance?${params}`);
  },
  
  async getAnalyticsSummary(period: string = '30d', projectId?: string) {
    const params = new URLSearchParams({ period });
    if (projectId) params.append('project_id', projectId);
    return await apiRequest(`/analytics/summary?${params}`);
  }
};

// Initialize authentication on module load
authAPI.initializeAuth();

export { apiRequest };
export default {
  auth: authAPI,
  system: systemAPI,
  federatedLearning: federatedLearningAPI,
  explainability: explainabilityAPI,
  multiCloud: multiCloudAPI,
  quantum: quantumAPI,
  governance: governanceAPI,
  monitoring: monitoringAPI
};