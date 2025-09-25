CREATE TABLE compliance_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compliance_framework VARCHAR(100) NOT NULL CHECK (compliance_framework IN ('GDPR',
    'EU_AI_Act',
    'ISO_27001',
    'SOC_2',
    'HIPAA',
    'PCI_DSS',
    'NIST')),
    compliance_status VARCHAR(50) DEFAULT 'compliant' CHECK (compliance_status IN ('compliant',
    'non_compliant',
    'under_review')),
    compliance_score DECIMAL(5,4) DEFAULT 1.0,
    last_audit_date TIMESTAMP WITH TIME ZONE,
    next_audit_date TIMESTAMP WITH TIME ZONE,
    audit_details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);