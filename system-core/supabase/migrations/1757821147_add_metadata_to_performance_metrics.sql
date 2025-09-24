-- Migration: add_metadata_to_performance_metrics
-- Created at: 1757821147

ALTER TABLE ai_performance_metrics ADD COLUMN IF NOT EXISTS metadata JSONB;;