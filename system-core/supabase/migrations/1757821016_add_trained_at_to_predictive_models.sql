-- Migration: add_trained_at_to_predictive_models
-- Created at: 1757821016

ALTER TABLE predictive_models ADD COLUMN IF NOT EXISTS trained_at TIMESTAMP WITH TIME ZONE;;