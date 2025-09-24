-- Migration: add_is_active_to_predictive_models
-- Created at: 1757821001

ALTER TABLE predictive_models ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;;