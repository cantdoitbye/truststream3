-- Migration: fix_nlp_analysis_results_schema
-- Created at: 1757821084

ALTER TABLE nlp_analysis_results 
ADD COLUMN IF NOT EXISTS confidence NUMERIC(3,2),
ADD COLUMN IF NOT EXISTS results JSONB,
ADD COLUMN IF NOT EXISTS language VARCHAR(10),
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS metadata JSONB;;