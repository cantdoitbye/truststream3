CREATE TABLE prompt_analysis_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_hash VARCHAR(64) UNIQUE NOT NULL,
    prompt_text TEXT NOT NULL,
    complexity_score DECIMAL(3,2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    optimal_provider VARCHAR(100) NOT NULL,
    reasoning_type VARCHAR(50) NOT NULL,
    estimated_tokens INTEGER NOT NULL,
    trust_requirement_level INTEGER DEFAULT 1,
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usage_count INTEGER DEFAULT 1
);