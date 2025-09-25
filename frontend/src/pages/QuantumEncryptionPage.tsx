import React from 'react';
import { Shield, Lock, Key, Zap } from 'lucide-react';
import { useQuantumEncryption } from '@/hooks/useQuantumEncryption';
import { MetricCard } from '@/components/UI/MetricCard';

export function QuantumEncryptionPage() {
  const { summary, operations, loading } = useQuantumEncryption();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-300">Loading Quantum Encryption System...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div 
        className="relative rounded-xl overflow-hidden h-48 flex items-center justify-center"
        style={{
          backgroundImage: 'url(/images/quantum_encryption_security_digital_shield_visualization.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
        <div className="relative z-10 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Quantum Encryption Center</h1>
          <p className="text-xl text-cyan-100">Post-quantum cryptography with ML-KEM-768, ML-DSA-65, FALCON, SPHINCS+</p>
        </div>
      </div>

      {/* Metrics */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Operations"
            value={summary.total_operations.toString()}
            icon={Shield}
            status="good"
            trend="up"
            trendValue="25%"
          />
          
          <MetricCard
            title="Success Rate"
            value={`${summary.success_rate}%`}
            target=">99%"
            icon={Lock}
            status={parseFloat(summary.success_rate) > 99 ? 'good' : 'warning'}
            trend="up"
            trendValue="1%"
          />
          
          <MetricCard
            title="Avg Processing"
            value={`${summary.average_processing_time_ms}ms`}
            target="<500ms"
            icon={Zap}
            status={summary.average_processing_time_ms < 500 ? 'good' : 'warning'}
            trend="down"
            trendValue="5%"
          />
          
          <MetricCard
            title="Quantum Ready"
            value={`${summary.quantum_ready_percentage}%`}
            icon={Key}
            status="good"
            trend="stable"
          />
        </div>
      )}

      <div className="text-center py-12">
        <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-400 mb-2">Quantum Encryption Dashboard</h3>
        <p className="text-slate-500">Advanced cryptographic operations interface coming soon</p>
      </div>
    </div>
  );
}