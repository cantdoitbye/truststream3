-- Integration Helper for Workflow Parser
-- Functions to integrate with workflow_parser.py ResourceEstimate class

-- Function to store workflow cost estimate from parser
CREATE OR REPLACE FUNCTION store_workflow_estimate(
    p_workflow_id UUID,
    p_user_id UUID,
    p_workflow_name VARCHAR(255),
    p_workflow_version VARCHAR(50) DEFAULT '1.0',
    p_workflow_hash VARCHAR(64) DEFAULT NULL,
    p_node_count INTEGER DEFAULT 0,
    p_supported_node_count INTEGER DEFAULT 0,
    p_complexity_score INTEGER DEFAULT 1,
    p_estimated_cpu_cores DECIMAL(8,4) DEFAULT 0.5,
    p_estimated_memory_mb INTEGER DEFAULT 512,
    p_estimated_gpu_cores DECIMAL(8,4) DEFAULT 0.0,
    p_estimated_storage_mb INTEGER DEFAULT 100,
    p_estimated_cost_per_run DECIMAL(12,6) DEFAULT 0.01,
    p_base_cost DECIMAL(12,6) DEFAULT 0.001,
    p_complexity_cost DECIMAL(12,6) DEFAULT 0,
    p_ai_cost DECIMAL(12,6) DEFAULT 0,
    p_integration_cost DECIMAL(12,6) DEFAULT 0,
    p_ai_nodes_count INTEGER DEFAULT 0,
    p_code_nodes_count INTEGER DEFAULT 0,
    p_integration_nodes_count INTEGER DEFAULT 0,
    p_webhook_nodes_count INTEGER DEFAULT 0,
    p_validation_status VARCHAR(20) DEFAULT 'pending',
    p_security_score INTEGER DEFAULT 100,
    p_security_issues JSONB DEFAULT '[]',
    p_validation_warnings JSONB DEFAULT '[]',
    p_validation_errors JSONB DEFAULT '[]',
    p_workflow_category VARCHAR(50) DEFAULT NULL,
    p_workflow_tags JSONB DEFAULT '[]'
)
RETURNS UUID
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
    estimate_id UUID;
BEGIN
    -- Insert or update workflow cost estimate
    INSERT INTO workflow_cost_estimates (
        workflow_id,
        user_id,
        workflow_name,
        workflow_version,
        workflow_hash,
        node_count,
        supported_node_count,
        complexity_score,
        estimated_cpu_cores,
        estimated_memory_mb,
        estimated_gpu_cores,
        estimated_storage_mb,
        estimated_cost_per_run,
        base_cost,
        complexity_cost,
        ai_cost,
        integration_cost,
        ai_nodes_count,
        code_nodes_count,
        integration_nodes_count,
        webhook_nodes_count,
        validation_status,
        security_score,
        security_issues,
        validation_warnings,
        validation_errors,
        workflow_category,
        workflow_tags,
        estimate_status,
        is_cached,
        cache_expires_at,
        last_validation_at
    ) VALUES (
        p_workflow_id,
        p_user_id,
        p_workflow_name,
        p_workflow_version,
        p_workflow_hash,
        p_node_count,
        p_supported_node_count,
        p_complexity_score,
        p_estimated_cpu_cores,
        p_estimated_memory_mb,
        p_estimated_gpu_cores,
        p_estimated_storage_mb,
        p_estimated_cost_per_run,
        p_base_cost,
        p_complexity_cost,
        p_ai_cost,
        p_integration_cost,
        p_ai_nodes_count,
        p_code_nodes_count,
        p_integration_nodes_count,
        p_webhook_nodes_count,
        p_validation_status,
        p_security_score,
        p_security_issues,
        p_validation_warnings,
        p_validation_errors,
        p_workflow_category,
        p_workflow_tags,
        'active',
        TRUE,
        NOW() + INTERVAL '24 hours',
        NOW()
    )
    ON CONFLICT (workflow_id, user_id)
    DO UPDATE SET
        workflow_name = EXCLUDED.workflow_name,
        workflow_version = EXCLUDED.workflow_version,
        workflow_hash = EXCLUDED.workflow_hash,
        node_count = EXCLUDED.node_count,
        supported_node_count = EXCLUDED.supported_node_count,
        complexity_score = EXCLUDED.complexity_score,
        estimated_cpu_cores = EXCLUDED.estimated_cpu_cores,
        estimated_memory_mb = EXCLUDED.estimated_memory_mb,
        estimated_gpu_cores = EXCLUDED.estimated_gpu_cores,
        estimated_storage_mb = EXCLUDED.estimated_storage_mb,
        estimated_cost_per_run = EXCLUDED.estimated_cost_per_run,
        base_cost = EXCLUDED.base_cost,
        complexity_cost = EXCLUDED.complexity_cost,
        ai_cost = EXCLUDED.ai_cost,
        integration_cost = EXCLUDED.integration_cost,
        ai_nodes_count = EXCLUDED.ai_nodes_count,
        code_nodes_count = EXCLUDED.code_nodes_count,
        integration_nodes_count = EXCLUDED.integration_nodes_count,
        webhook_nodes_count = EXCLUDED.webhook_nodes_count,
        validation_status = EXCLUDED.validation_status,
        security_score = EXCLUDED.security_score,
        security_issues = EXCLUDED.security_issues,
        validation_warnings = EXCLUDED.validation_warnings,
        validation_errors = EXCLUDED.validation_errors,
        workflow_category = EXCLUDED.workflow_category,
        workflow_tags = EXCLUDED.workflow_tags,
        updated_at = NOW(),
        cache_expires_at = NOW() + INTERVAL '24 hours',
        last_validation_at = NOW()
    RETURNING id INTO estimate_id;
    
    RETURN estimate_id;
END;
$$;

-- Function to get cached workflow estimate
CREATE OR REPLACE FUNCTION get_workflow_estimate(
    p_workflow_id UUID,
    p_user_id UUID
)
RETURNS workflow_cost_estimates
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT *
    FROM workflow_cost_estimates
    WHERE workflow_id = p_workflow_id
      AND user_id = p_user_id
      AND estimate_status = 'active'
      AND (NOT is_cached OR cache_expires_at > NOW())
    ORDER BY updated_at DESC
    LIMIT 1;
$$;

-- Function to update estimate accuracy after actual run
CREATE OR REPLACE FUNCTION update_estimate_accuracy(
    p_workflow_id UUID,
    p_user_id UUID,
    p_actual_cost DECIMAL(12,6),
    p_actual_execution_time INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
    current_estimate workflow_cost_estimates%ROWTYPE;
    new_accuracy DECIMAL(5,4);
    new_avg_cost DECIMAL(12,6);
    new_run_count INTEGER;
BEGIN
    -- Get current estimate
    SELECT * INTO current_estimate
    FROM workflow_cost_estimates
    WHERE workflow_id = p_workflow_id
      AND user_id = p_user_id
      AND estimate_status = 'active'
    ORDER BY updated_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Calculate new metrics
    new_run_count := current_estimate.actual_runs_count + 1;
    new_avg_cost := (
        current_estimate.average_actual_cost * current_estimate.actual_runs_count + p_actual_cost
    ) / new_run_count;
    
    -- Calculate accuracy (inverse of absolute percentage error)
    IF current_estimate.estimated_cost_per_run > 0 THEN
        new_accuracy := 1.0 - LEAST(1.0, 
            ABS(p_actual_cost - current_estimate.estimated_cost_per_run) / current_estimate.estimated_cost_per_run
        );
    ELSE
        new_accuracy := 0.5; -- Default when no estimate available
    END IF;
    
    -- Update the estimate record
    UPDATE workflow_cost_estimates
    SET
        actual_runs_count = new_run_count,
        average_actual_cost = new_avg_cost,
        cost_prediction_accuracy = new_accuracy,
        last_actual_cost = p_actual_cost,
        last_run_at = NOW(),
        updated_at = NOW()
    WHERE id = current_estimate.id;
    
    RETURN TRUE;
END;
$$;

-- Function to get workflow estimate for credit deduction (integrates with workflow_parser.py)
CREATE OR REPLACE FUNCTION get_workflow_cost_for_deduction(
    p_workflow_id UUID,
    p_user_id UUID,
    p_user_tier VARCHAR(20) DEFAULT 'standard',
    p_execution_region VARCHAR(50) DEFAULT 'us-east-1'
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
    estimate_record workflow_cost_estimates%ROWTYPE;
    tier_multiplier DECIMAL(5,4) := 1.0;
    region_multiplier DECIMAL(5,4) := 1.0;
    final_cost DECIMAL(12,6);
BEGIN
    -- Get workflow estimate
    SELECT * INTO estimate_record
    FROM workflow_cost_estimates
    WHERE workflow_id = p_workflow_id
      AND user_id = p_user_id
      AND estimate_status = 'active'
    ORDER BY updated_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        -- Return default cost if no estimate exists
        RETURN jsonb_build_object(
            'found', false,
            'estimated_cost', 0.01,
            'base_cost', 0.001,
            'complexity_score', 1,
            'message', 'No estimate found, using default cost'
        );
    END IF;
    
    -- Apply tier multipliers
    CASE p_user_tier
        WHEN 'free' THEN tier_multiplier := 1.0;
        WHEN 'standard' THEN tier_multiplier := 0.9;
        WHEN 'premium' THEN tier_multiplier := 0.8;
        WHEN 'enterprise' THEN tier_multiplier := 0.7;
    END CASE;
    
    -- Apply region multipliers (example pricing)
    CASE p_execution_region
        WHEN 'us-east-1', 'us-west-2' THEN region_multiplier := 1.0;
        WHEN 'eu-west-1', 'eu-central-1' THEN region_multiplier := 1.1;
        WHEN 'ap-southeast-1', 'ap-northeast-1' THEN region_multiplier := 1.2;
        ELSE region_multiplier := 1.0;
    END CASE;
    
    -- Calculate final cost
    final_cost := estimate_record.estimated_cost_per_run * tier_multiplier * region_multiplier;
    
    -- Return comprehensive cost breakdown
    RETURN jsonb_build_object(
        'found', true,
        'estimate_id', estimate_record.id,
        'workflow_name', estimate_record.workflow_name,
        'complexity_score', estimate_record.complexity_score,
        'estimated_cost', final_cost,
        'base_estimate', estimate_record.estimated_cost_per_run,
        'cost_breakdown', jsonb_build_object(
            'base_cost', estimate_record.base_cost,
            'complexity_cost', estimate_record.complexity_cost,
            'ai_cost', estimate_record.ai_cost,
            'integration_cost', estimate_record.integration_cost
        ),
        'resource_estimates', jsonb_build_object(
            'cpu_cores', estimate_record.estimated_cpu_cores,
            'memory_mb', estimate_record.estimated_memory_mb,
            'gpu_cores', estimate_record.estimated_gpu_cores,
            'storage_mb', estimate_record.estimated_storage_mb
        ),
        'multipliers', jsonb_build_object(
            'tier_multiplier', tier_multiplier,
            'region_multiplier', region_multiplier,
            'user_tier', p_user_tier,
            'execution_region', p_execution_region
        ),
        'accuracy_metrics', jsonb_build_object(
            'runs_count', estimate_record.actual_runs_count,
            'average_actual_cost', estimate_record.average_actual_cost,
            'prediction_accuracy', estimate_record.cost_prediction_accuracy,
            'last_actual_cost', estimate_record.last_actual_cost
        ),
        'validation', jsonb_build_object(
            'status', estimate_record.validation_status,
            'security_score', estimate_record.security_score,
            'warnings', estimate_record.validation_warnings,
            'errors', estimate_record.validation_errors
        ),
        'cache_info', jsonb_build_object(
            'is_cached', estimate_record.is_cached,
            'expires_at', estimate_record.cache_expires_at,
            'last_updated', estimate_record.updated_at
        )
    );
END;
$$;

-- Comments for integration documentation
COMMENT ON FUNCTION store_workflow_estimate IS 'Stores cost estimates from workflow_parser.py ResourceEstimate class';
COMMENT ON FUNCTION get_workflow_estimate IS 'Retrieves cached workflow cost estimate';
COMMENT ON FUNCTION update_estimate_accuracy IS 'Updates estimate accuracy based on actual workflow execution costs';
COMMENT ON FUNCTION get_workflow_cost_for_deduction IS 'Gets workflow cost with user tier and region adjustments for credit deduction';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION store_workflow_estimate TO service_role;
GRANT EXECUTE ON FUNCTION get_workflow_estimate TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION update_estimate_accuracy TO service_role;
GRANT EXECUTE ON FUNCTION get_workflow_cost_for_deduction TO service_role, authenticated;