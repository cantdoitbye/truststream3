-- Migration: create_pending_payments_table
-- Created at: 1758788009

-- Pending Payments Table
-- Tracks Stripe payment intents and their status
CREATE TABLE pending_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Stripe integration
    stripe_payment_intent_id VARCHAR(255) NOT NULL UNIQUE,
    stripe_customer_id VARCHAR(255),
    
    -- Package and pricing
    package_id VARCHAR(50) NOT NULL,
    package_name VARCHAR(255) NOT NULL,
    credit_amount INTEGER NOT NULL CHECK (credit_amount > 0),
    bonus_credits INTEGER DEFAULT 0 CHECK (bonus_credits >= 0),
    fiat_amount DECIMAL(10,2) NOT NULL CHECK (fiat_amount > 0),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Payment status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 'canceled', 'refunded'
    )),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Stripe webhook data
    stripe_data JSONB DEFAULT '{}',
    
    -- Audit
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_pending_payments_user_id ON pending_payments(user_id);
CREATE INDEX idx_pending_payments_stripe_intent ON pending_payments(stripe_payment_intent_id);
CREATE INDEX idx_pending_payments_status ON pending_payments(status);
CREATE INDEX idx_pending_payments_created_at ON pending_payments(created_at DESC);
CREATE INDEX idx_pending_payments_user_status ON pending_payments(user_id, status);;