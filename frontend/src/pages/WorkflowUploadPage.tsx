import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle2, Zap, Brain, Code, Globe, DollarSign, Clock, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MetricCard } from '@/components/UI/MetricCard';
import { cn } from '@/lib/utils';

interface WorkflowUploadResult {
  success: boolean;
  data?: {
    workflowId: string;
    workflowName: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    parsing: {
      nodeCount: number;
      supportedNodeCount: number;
      complexityScore: number;
      aiNodesCount: number;
      codeNodesCount: number;
      integrationNodesCount: number;
      webhookNodesCount: number;
    };
    validation: {
      isValid: boolean;
      errors: string[];
      warnings: string[];
    };
    security: {
      securityScore: number;
      securityIssues: string[];
      isSecure: boolean;
    };
    resourceEstimate: {
      cpuCores: number;
      memoryMb: number;
      gpuCores: number;
      storageMb: number;
      estimatedCostPerRun: number;
      baseCost: number;
      complexityCost: number;
      aiCost: number;
      integrationCost: number;
    };
    costBreakdown: {
      baseOoumphCost: number;
      cpuMarkup: number;
      gpuMarkup: number;
      storageMarkup: number;
      totalOoumphCost: number;
    };
    status: string;
    uploadedAt: string;
  };
  error?: {
    code: string;
    message: string;
    validation_errors?: string[];
  };
}

export function WorkflowUploadPage() {
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<WorkflowUploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.json')) {
      setUploadResult({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'Please upload a .json file'
        }
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setUploadResult({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size must be less than 5MB'
        }
      });
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      // Read file content
      const fileContent = await file.text();
      let workflowData;
      
      try {
        workflowData = JSON.parse(fileContent);
      } catch (error) {
        throw new Error('Invalid JSON file');
      }

      // Upload to Supabase edge function
      const { data, error } = await supabase.functions.invoke('n8n-workflow-upload', {
        body: {
          workflowName: workflowData.name || file.name.replace('.json', ''),
          workflowData: workflowData,
          fileName: file.name
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      setUploadResult(data);
    } catch (error) {
      setUploadResult({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: error instanceof Error ? error.message : 'Upload failed'
        }
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded': return 'text-green-400';
      case 'invalid': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-cyan-400';
    }
  };

  const formatFileSize = (bytes: number) => {
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${kb.toFixed(2)} KB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">N8N Workflow Upload</h1>
          <p className="text-slate-400">Upload and deploy your n8n workflows as AI agents</p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Upload Workflow</h3>
          <Upload className="w-5 h-5 text-cyan-400" />
        </div>

        {/* Drag and Drop Area */}
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200',
            isDragging
              ? 'border-cyan-400 bg-cyan-500/10'
              : 'border-slate-600 hover:border-slate-500',
            isUploading && 'opacity-50 pointer-events-none'
          )}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />

          {isUploading ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="text-cyan-400 font-medium">Processing workflow...</p>
                <p className="text-slate-400 text-sm mt-1">Parsing nodes and calculating costs</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full flex items-center justify-center">
                  <FileText className="w-8 h-8 text-cyan-400" />
                </div>
              </div>
              
              <div>
                <h4 className="text-white font-medium mb-2">
                  {isDragging ? 'Drop your workflow here' : 'Upload N8N Workflow'}
                </h4>
                <p className="text-slate-400 text-sm">
                  Drag and drop your .json file here, or click to browse
                </p>
                <p className="text-slate-500 text-xs mt-2">
                  Maximum file size: 5MB • Supported format: .json
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Results */}
      {uploadResult && (
        <div className="space-y-6">
          {uploadResult.success ? (
            <>
              {/* Success Header */}
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                  <div>
                    <h3 className="text-green-400 font-medium">Workflow Uploaded Successfully</h3>
                    <p className="text-green-300/80 text-sm mt-1">
                      {uploadResult.data?.workflowName} • {formatFileSize(uploadResult.data?.fileSize || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Workflow Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title="Node Count"
                  value={uploadResult.data?.parsing.nodeCount.toString() || '0'}
                  icon={Brain}
                  status="good"
                />
                
                <MetricCard
                  title="Complexity Score"
                  value={uploadResult.data?.parsing.complexityScore.toString() || '0'}
                  target="<80"
                  icon={BarChart3}
                  status={uploadResult.data && uploadResult.data.parsing.complexityScore < 80 ? 'good' : 'warning'}
                />
                
                <MetricCard
                  title="AI Nodes"
                  value={uploadResult.data?.parsing.aiNodesCount.toString() || '0'}
                  icon={Zap}
                  status="good"
                />
                
                <MetricCard
                  title="Security Score"
                  value={`${uploadResult.data?.security.securityScore || 0}%`}
                  target=">80%"
                  icon={CheckCircle2}
                  status={uploadResult.data && uploadResult.data.security.securityScore > 80 ? 'good' : 'warning'}
                />
              </div>

              {/* Cost Breakdown */}
              <div className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white">Cost Analysis</h3>
                  <DollarSign className="w-5 h-5 text-cyan-400" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-white font-medium">Resource Estimates</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400">CPU Cores</span>
                        <span className="text-white">{uploadResult.data?.resourceEstimate.cpuCores.toFixed(2) || '0'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Memory</span>
                        <span className="text-white">{uploadResult.data?.resourceEstimate.memoryMb || 0} MB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">GPU Cores</span>
                        <span className="text-white">{uploadResult.data?.resourceEstimate.gpuCores.toFixed(1) || '0'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Storage</span>
                        <span className="text-white">{uploadResult.data?.resourceEstimate.storageMb || 0} MB</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-white font-medium">Ooumph Coin Costs</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Base Cost</span>
                        <span className="text-white">{uploadResult.data?.costBreakdown.baseOoumphCost.toFixed(6) || '0'} OC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">CPU Markup (+25%)</span>
                        <span className="text-white">{uploadResult.data?.costBreakdown.cpuMarkup.toFixed(6) || '0'} OC</span>
                      </div>
                      {uploadResult.data && uploadResult.data.costBreakdown.gpuMarkup > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">GPU Markup (+30%)</span>
                          <span className="text-white">{uploadResult.data.costBreakdown.gpuMarkup.toFixed(6)} OC</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-400">Storage Markup (+20%)</span>
                        <span className="text-white">{uploadResult.data?.costBreakdown.storageMarkup.toFixed(6) || '0'} OC</span>
                      </div>
                      <hr className="border-slate-600" />
                      <div className="flex justify-between text-lg font-semibold">
                        <span className="text-cyan-400">Total Cost per Run</span>
                        <span className="text-cyan-400">{uploadResult.data?.costBreakdown.totalOoumphCost.toFixed(6) || '0'} OC</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Validation Results */}
              {(uploadResult.data?.validation.errors.length || 0) > 0 || (uploadResult.data?.validation.warnings.length || 0) > 0 ? (
                <div className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-white">Validation Results</h3>
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  </div>

                  <div className="space-y-4">
                    {uploadResult.data?.validation.errors.map((error, index) => (
                      <div key={index} className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                          <AlertTriangle className="w-5 h-5 text-red-400" />
                          <span className="text-red-400 font-medium">Error:</span>
                          <span className="text-red-300">{error}</span>
                        </div>
                      </div>
                    ))}

                    {uploadResult.data?.validation.warnings.map((warning, index) => (
                      <div key={index} className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                          <AlertTriangle className="w-5 h-5 text-yellow-400" />
                          <span className="text-yellow-400 font-medium">Warning:</span>
                          <span className="text-yellow-300">{warning}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Security Issues */}
              {uploadResult.data?.security.securityIssues.length ? (
                <div className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-white">Security Analysis</h3>
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>

                  <div className="space-y-4">
                    {uploadResult.data.security.securityIssues.map((issue, index) => (
                      <div key={index} className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                          <AlertTriangle className="w-5 h-5 text-red-400" />
                          <span className="text-red-400 font-medium">Security Issue:</span>
                          <span className="text-red-300">{issue}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Next Steps */}
              <div className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white">Next Steps</h3>
                  <Clock className="w-5 h-5 text-cyan-400" />
                </div>

                <div className="space-y-3">
                  {uploadResult.data?.validation.isValid ? (
                    <div className="flex items-center space-x-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      <span className="text-green-300">Workflow is ready for deployment</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      <span className="text-red-300">Fix validation errors before deployment</span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-3 p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-slate-300">• Review cost breakdown and resource requirements</span>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-slate-300">• Ensure sufficient Ooumph Coin balance for deployment</span>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-slate-300">• Navigate to Workflow Management to deploy your agent</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // Error Display
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <div>
                  <h3 className="text-red-400 font-medium">Upload Failed</h3>
                  <p className="text-red-300/80 text-sm mt-1">{uploadResult.error?.message}</p>
                  
                  {uploadResult.error?.validation_errors && (
                    <div className="mt-3 space-y-1">
                      {uploadResult.error.validation_errors.map((error, index) => (
                        <p key={index} className="text-red-300/80 text-sm">• {error}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}