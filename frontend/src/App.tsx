import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { SystemOverview } from '@/components/Dashboard/SystemOverview';
import { WorkflowUploadPage } from '@/pages/WorkflowUploadPage';
import { WorkflowManagementPage } from '@/pages/WorkflowManagementPage';
import { CreditManagementPage } from '@/pages/CreditManagementPage';
import { AIGovernancePage } from '@/pages/AIGovernancePage';
import { FederatedLearningPage } from '@/pages/FederatedLearningPage';
import { ExplainabilityPage } from '@/pages/ExplainabilityPage';
import { MultiCloudPage } from '@/pages/MultiCloudPage';
import { QuantumEncryptionPage } from '@/pages/QuantumEncryptionPage';
import { CompliancePage } from '@/pages/CompliancePage';
import { SettingsPage } from '@/pages/SettingsPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<SystemOverview />} />
            <Route path="workflow-upload" element={<WorkflowUploadPage />} />
            <Route path="workflow-management" element={<WorkflowManagementPage />} />
            <Route path="credit-management" element={<CreditManagementPage />} />
            <Route path="ai-governance" element={<AIGovernancePage />} />
            <Route path="federated-learning" element={<FederatedLearningPage />} />
            <Route path="explainability" element={<ExplainabilityPage />} />
            <Route path="multi-cloud" element={<MultiCloudPage />} />
            <Route path="quantum" element={<QuantumEncryptionPage />} />
            <Route path="compliance" element={<CompliancePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;