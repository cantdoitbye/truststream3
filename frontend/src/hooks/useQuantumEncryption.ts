import { useState, useEffect } from 'react';
import { quantumAPI } from '@/lib/api';

export interface QuantumOperation {
  id: string;
  operation_type: 'encrypt' | 'decrypt' | 'sign' | 'verify' | 'key_generation';
  algorithm: 'ML-KEM-768' | 'ML-DSA-65' | 'FALCON' | 'SPHINCS+';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_time_ms: number;
  key_id: string;
  operation_metadata: Record<string, any>;
  created_at: string;
}

export interface QuantumSummary {
  total_operations: number;
  completed_operations: number;
  processing_operations: number;
  failed_operations: number;
  success_rate: string;
  average_processing_time_ms: number;
  operation_types: Record<string, number>;
  algorithm_usage: Record<string, number>;
  quantum_ready_percentage: number;
}

export function useQuantumEncryption() {
  const [summary, setSummary] = useState<QuantumSummary | null>(null);
  const [operations, setOperations] = useState<QuantumOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuantumData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await quantumAPI.getOperations();
      
      if (response.success && response.data) {
        const data = response.data as any;
        
        // Handle the data structure from the backend
        if (data.summary) {
          setSummary(data.summary as QuantumSummary);
        }
        
        if (data.operations) {
          setOperations(data.operations as QuantumOperation[]);
        } else if (Array.isArray(data)) {
          setOperations(data as QuantumOperation[]);
        }
      } else {
        throw new Error(response.error?.message || 'Failed to fetch quantum encryption data');
      }
    } catch (err) {
      console.error('Error fetching quantum encryption data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch quantum encryption data');
    } finally {
      setLoading(false);
    }
  };

  const performQuantumOperation = async (operationData: {
    operation_type: string;
    algorithm: string;
    data_payload?: any;
    key_id?: string;
  }) => {
    try {
      let response;
      
      switch (operationData.operation_type) {
        case 'encrypt':
          response = await quantumAPI.encrypt(operationData.data_payload, operationData.algorithm);
          break;
        case 'decrypt':
          response = await quantumAPI.decrypt(operationData.data_payload, operationData.key_id!);
          break;
        case 'sign':
          response = await quantumAPI.sign(operationData.data_payload, operationData.algorithm);
          break;
        case 'verify':
          response = await quantumAPI.verify(operationData.data_payload, operationData.data_payload, operationData.algorithm);
          break;
        case 'key_generation':
          response = await quantumAPI.generateKey(operationData.algorithm);
          break;
        default:
          throw new Error(`Unsupported operation type: ${operationData.operation_type}`);
      }
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to perform quantum operation');
      }
      
      // Refresh data after performing operation
      await fetchQuantumData();
      
      return response;
    } catch (err) {
      console.error('Error performing quantum operation:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchQuantumData();
    
    // Set up polling every 10 seconds for quantum operations
    const interval = setInterval(fetchQuantumData, 10000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    summary,
    operations,
    loading,
    error,
    performOperation: performQuantumOperation,
    refetch: fetchQuantumData
  };
}