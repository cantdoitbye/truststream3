-- Credit Transactions Table
-- Records all credit operations (debits, credits, transfers)
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN (
        'debit', 'credit', 'purchase', 'refund', 'transfer_in', 'transfer_out',
        'bonus', 'penalty', 'workflow_cost', 'subscription_charge'
    )),
    
    -- Transaction amounts
    amount DECIMAL(12,6) NOT NULL CHECK (amount > 0),
    balance_before DECIMAL(12,6) NOT NULL,
    balance_after DECIMAL(12,6) NOT NULL,
    
    -- Transaction details
    description TEXT,
    reference_type VARCHAR(50), -- 'workflow_run', 'purchase', 'manual', 'system'
    reference_id UUID,          -- ID of related entity (workflow, purchase, etc.)
    
    -- Workflow-specific fields
    workflow_id UUID,
    workflow_name VARCHAR(255),
    resource_cost JSONB,        -- Resource breakdown from workflow_parser
    
    -- Payment-related fields
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    external_transaction_id VARCHAR(255),
    
    -- System fields
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN (
        'pending', 'completed', 'failed', 'cancelled', 'reversed'
    )),
    processed_by VARCHAR(50) DEFAULT 'system',
    processing_time_ms INTEGER DEFAULT 0,
    
    -- Audit and metadata
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_balance_calculation CHECK (
        (transaction_type IN ('credit', 'purchase', 'refund', 'transfer_in', 'bonus') 
         AND balance_after = balance_before + amount) OR
        (transaction_type IN ('debit', 'transfer_out', 'penalty', 'workflow_cost', 'subscription_charge')
         AND balance_after = balance_before - amount)
    )
);

-- Indexes for efficient querying
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX idx_credit_transactions_status ON credit_transactions(status);
CREATE INDEX idx_credit_transactions_reference ON credit_transactions(reference_type, reference_id);
CREATE INDEX idx_credit_transactions_workflow ON credit_transactions(workflow_id) WHERE workflow_id IS NOT NULL;
CREATE INDEX idx_credit_transactions_amount ON credit_transactions(amount DESC);

-- Partial index for pending transactions (for monitoring)
CREATE INDEX idx_credit_transactions_pending ON credit_transactions(created_at DESC) 
WHERE status = 'pending';

-- Comments for documentation
COMMENT ON TABLE credit_transactions IS 'Complete audit trail of all credit transactions in the system';
COMMENT ON COLUMN credit_transactions.resource_cost IS 'Detailed breakdown of resource costs from workflow_parser ResourceEstimate';
COMMENT ON COLUMN credit_transactions.metadata IS 'Additional transaction metadata (error details, system info, etc.)';