-- Row Level Security Policies for Ooumph Credit System
-- Ensures users can only access their own credit data

-- Enable RLS on all credit-related tables
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_cost_estimates ENABLE ROW LEVEL SECURITY;

-- USER_CREDITS policies
-- Users can only view and update their own credit records
CREATE POLICY "Users can view own credits" ON user_credits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credits" ON user_credits
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role full access to user_credits" ON user_credits
    FOR ALL USING (auth.role() = 'service_role');

-- CREDIT_TRANSACTIONS policies
-- Users can only view their own transactions
CREATE POLICY "Users can view own transactions" ON credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Users cannot directly insert/update transactions (only through edge functions)
-- Service role has full access for automated operations
CREATE POLICY "Service role full access to transactions" ON credit_transactions
    FOR ALL USING (auth.role() = 'service_role');

-- USAGE_TRACKING policies
-- Users can view their own usage data
CREATE POLICY "Users can view own usage" ON usage_tracking
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all usage tracking
CREATE POLICY "Service role full access to usage_tracking" ON usage_tracking
    FOR ALL USING (auth.role() = 'service_role');

-- BILLING_HISTORY policies
-- Users can view their own billing history
CREATE POLICY "Users can view own billing" ON billing_history
    FOR SELECT USING (auth.uid() = user_id);

-- Service role manages billing records
CREATE POLICY "Service role full access to billing_history" ON billing_history
    FOR ALL USING (auth.role() = 'service_role');

-- WORKFLOW_COST_ESTIMATES policies
-- Users can view and manage their own workflow estimates
CREATE POLICY "Users can manage own estimates" ON workflow_cost_estimates
    FOR ALL USING (auth.uid() = user_id);

-- Service role has full access for system operations
CREATE POLICY "Service role full access to estimates" ON workflow_cost_estimates
    FOR ALL USING (auth.role() = 'service_role');

-- Additional security functions

-- Function to check if user has sufficient credits (callable by authenticated users)
CREATE OR REPLACE FUNCTION check_sufficient_credits(required_amount DECIMAL)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT COALESCE(
        (SELECT current_balance >= required_amount 
         FROM user_credits 
         WHERE user_id = auth.uid()),
        FALSE
    );
$$;

-- Function to get user's current balance (callable by authenticated users)
CREATE OR REPLACE FUNCTION get_current_balance()
RETURNS DECIMAL(12,6)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT COALESCE(
        (SELECT current_balance 
         FROM user_credits 
         WHERE user_id = auth.uid()),
        0.0
    );
$$;

-- Function to get daily spending (callable by authenticated users)
CREATE OR REPLACE FUNCTION get_daily_spending()
RETURNS DECIMAL(12,6)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT COALESCE(
        SUM(amount), 
        0.0
    )
    FROM credit_transactions 
    WHERE user_id = auth.uid() 
      AND transaction_type IN ('workflow_cost', 'debit')
      AND created_at >= CURRENT_DATE;
$$;

-- Audit trigger function for tracking credit changes
CREATE OR REPLACE FUNCTION audit_credit_changes()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
    -- Log significant balance changes to a separate audit table if needed
    -- This is a placeholder for additional audit requirements
    
    -- Update the updated_at timestamp
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$;

-- Apply audit trigger to user_credits table
CREATE TRIGGER user_credits_audit_trigger
    BEFORE UPDATE ON user_credits
    FOR EACH ROW
    EXECUTE FUNCTION audit_credit_changes();

-- Comments for security documentation
COMMENT ON POLICY "Users can view own credits" ON user_credits IS 'Allows users to view only their own credit information';
COMMENT ON POLICY "Service role full access to user_credits" ON user_credits IS 'Allows edge functions with service role to manage credits';
COMMENT ON FUNCTION check_sufficient_credits(DECIMAL) IS 'Security function to check if authenticated user has sufficient credits';
COMMENT ON FUNCTION get_current_balance() IS 'Security function to get authenticated user\'s current credit balance';
COMMENT ON FUNCTION get_daily_spending() IS 'Security function to calculate authenticated user\'s daily spending';

-- Grant execute permissions to authenticated users for utility functions
GRANT EXECUTE ON FUNCTION check_sufficient_credits(DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_balance() TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_spending() TO authenticated;