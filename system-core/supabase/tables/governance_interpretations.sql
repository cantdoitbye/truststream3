CREATE TABLE governance_interpretations (
    id SERIAL PRIMARY KEY,
    interpretation_id VARCHAR(255) UNIQUE NOT NULL,
    query_text TEXT NOT NULL,
    query_hash VARCHAR(64) NOT NULL,
    relevant_policies JSON,
    ai_interpretation JSON,
    confidence_score DECIMAL(3,2),
    human_review_required BOOLEAN DEFAULT false,
    precedent_cases JSON,
    interpretation_status VARCHAR(50) DEFAULT 'ai_complete',
    expires_at TIMESTAMP,
    metadata JSON,
    human_review JSON,
    final_interpretation TEXT,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);