-- Billing History Table
-- Records payment history, credit purchases, and billing events
CREATE TABLE billing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Transaction identification
    billing_transaction_id VARCHAR(255) UNIQUE NOT NULL,
    external_transaction_id VARCHAR(255), -- Stripe, PayPal, etc.
    
    -- Transaction details
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN (
        'credit_purchase', 'subscription_payment', 'refund', 'chargeback',
        'failed_payment', 'partial_refund', 'bonus_credit', 'promotional_credit'
    )),
    
    -- Amounts
    currency_code VARCHAR(3) DEFAULT 'USD',
    fiat_amount DECIMAL(12,2) NOT NULL, -- Amount in fiat currency
    credit_amount DECIMAL(12,6) NOT NULL, -- Amount in ooumph coins
    exchange_rate DECIMAL(12,6), -- Fiat to credit exchange rate at time of transaction
    
    -- Credit package details
    package_name VARCHAR(100),
    package_tier VARCHAR(20) CHECK (package_tier IN ('starter', 'standard', 'premium', 'enterprise')),
    bonus_credits DECIMAL(12,6) DEFAULT 0,
    discount_applied DECIMAL(5,2) DEFAULT 0, -- Percentage discount
    promotional_code VARCHAR(50),
    
    -- Payment method details
    payment_method VARCHAR(50) NOT NULL, -- 'stripe_card', 'paypal', 'bank_transfer', etc.
    payment_processor VARCHAR(50) NOT NULL,
    card_last_four VARCHAR(4),
    card_brand VARCHAR(20),
    payment_country VARCHAR(2),
    
    -- Transaction status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'disputed'
    )),
    failure_reason VARCHAR(255),
    failure_code VARCHAR(50),
    
    -- Timestamps
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    settled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Invoice and receipt
    invoice_number VARCHAR(100),
    receipt_url TEXT,
    invoice_url TEXT,
    
    -- Tax and compliance
    tax_amount DECIMAL(12,2) DEFAULT 0,
    tax_rate DECIMAL(5,4) DEFAULT 0,
    tax_country VARCHAR(2),
    vat_number VARCHAR(50),
    
    -- Risk and fraud detection
    risk_score DECIMAL(3,2), -- 0-100 risk score
    fraud_flags JSONB DEFAULT '{}',
    
    -- Subscription-related fields
    subscription_id VARCHAR(255),
    billing_period_start DATE,
    billing_period_end DATE,
    is_recurring BOOLEAN DEFAULT false,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    notes TEXT,
    
    -- Audit fields
    processed_by VARCHAR(100) DEFAULT 'system',
    ip_address INET,
    user_agent TEXT
);

-- Indexes for efficient querying
CREATE INDEX idx_billing_history_user_id ON billing_history(user_id);
CREATE INDEX idx_billing_history_transaction_date ON billing_history(transaction_date DESC);
CREATE INDEX idx_billing_history_status ON billing_history(status);
CREATE INDEX idx_billing_history_type ON billing_history(transaction_type);
CREATE INDEX idx_billing_history_external_id ON billing_history(external_transaction_id) WHERE external_transaction_id IS NOT NULL;
CREATE INDEX idx_billing_history_subscription ON billing_history(subscription_id) WHERE subscription_id IS NOT NULL;
CREATE INDEX idx_billing_history_user_date ON billing_history(user_id, transaction_date DESC);

-- Unique constraint on external transaction ID when present
CREATE UNIQUE INDEX idx_billing_history_unique_external ON billing_history(external_transaction_id) 
WHERE external_transaction_id IS NOT NULL;

-- Comments for documentation
COMMENT ON TABLE billing_history IS 'Complete billing and payment history for credit purchases and subscriptions';
COMMENT ON COLUMN billing_history.exchange_rate IS 'Fiat currency to ooumph coin exchange rate at transaction time';
COMMENT ON COLUMN billing_history.fraud_flags IS 'Fraud detection results and flags from payment processor';