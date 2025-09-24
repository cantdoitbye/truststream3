CREATE TABLE prompt_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    prompt_template TEXT NOT NULL,
    input_variables JSONB,
    output_format JSONB,
    version VARCHAR(20) DEFAULT '1.0.0',
    author_id UUID,
    rating_average DECIMAL(3,2) DEFAULT 0.0,
    usage_count INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_public BOOLEAN DEFAULT true,
    fork_source_id UUID,
    collaboration_settings JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);