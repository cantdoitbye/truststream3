-- Migration: enable_ai_usage_logs_access
-- Created at: 1757799531

-- Enable RLS on ai_usage_logs if not already enabled
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anonymous role to insert usage logs
CREATE POLICY "Allow anon to insert usage logs" ON ai_usage_logs 
FOR INSERT TO anon
WITH CHECK (true);

-- Create policy to allow anonymous role to update usage logs
CREATE POLICY "Allow anon to update usage logs" ON ai_usage_logs 
FOR UPDATE TO anon
USING (true);

-- Create policy to allow authenticated users to view their own logs
CREATE POLICY "Users can view own usage logs" ON ai_usage_logs 
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Create policy to allow service role full access (for admin functions)
CREATE POLICY "Service role full access" ON ai_usage_logs 
FOR ALL TO service_role
USING (true);;