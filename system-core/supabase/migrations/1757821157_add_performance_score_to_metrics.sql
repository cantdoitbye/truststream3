-- Migration: add_performance_score_to_metrics
-- Created at: 1757821157

ALTER TABLE ai_performance_metrics ADD COLUMN IF NOT EXISTS performance_score NUMERIC(5,4);;