CREATE TABLE workflow_execution_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL,
    step_index INTEGER NOT NULL,
    step_name VARCHAR(255),
    assigned_agent VARCHAR(100),
    step_status VARCHAR(20) DEFAULT 'pending',
    input_data JSONB,
    output_data JSONB,
    execution_time_ms INTEGER,
    error_details TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);