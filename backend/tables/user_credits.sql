-- User Credits Table
-- Manages user credit balances and account information
CREATE TABLE user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    current_balance DECIMAL(12,6) DEFAULT 0.0 CHECK (current_balance >= 0),
    total_earned DECIMAL(12,6) DEFAULT 0.0,
    total_spent DECIMAL(12,6) DEFAULT 0.0,
    total_purchased DECIMAL(12,6) DEFAULT 0.0,
    
    -- Credit limits and thresholds
    daily_spend_limit DECIMAL(12,6) DEFAULT 100.0,
    monthly_spend_limit DECIMAL(12,6) DEFAULT 1000.0,
    low_balance_threshold DECIMAL(12,6) DEFAULT 10.0,
    
    -- Account status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'frozen', 'closed')),
    auto_recharge_enabled BOOLEAN DEFAULT false,
    auto_recharge_amount DECIMAL(12,6) DEFAULT 50.0,
    auto_recharge_threshold DECIMAL(12,6) DEFAULT 10.0,
    
    -- Metadata
    billing_tier VARCHAR(20) DEFAULT 'standard' CHECK (billing_tier IN ('free', 'standard', 'premium', 'enterprise')),
    discount_rate DECIMAL(5,4) DEFAULT 0.0 CHECK (discount_rate >= 0 AND discount_rate <= 1),
    preferences JSONB DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_transaction_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    UNIQUE(user_id)
);

-- Indexes for efficient querying
CREATE INDEX idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX idx_user_credits_status ON user_credits(status);
CREATE INDEX idx_user_credits_balance ON user_credits(current_balance);
CREATE INDEX idx_user_credits_updated_at ON user_credits(updated_at);

-- Comments for documentation
COMMENT ON TABLE user_credits IS 'Manages user credit balances and account settings for the ooumph coin system';
COMMENT ON COLUMN user_credits.current_balance IS 'Current available credit balance in ooumph coins';
COMMENT ON COLUMN user_credits.daily_spend_limit IS 'Maximum credits that can be spent per day';
COMMENT ON COLUMN user_credits.preferences IS 'User preferences for notifications, reporting, etc.';