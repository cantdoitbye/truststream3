-- Migration: add_text_input_to_nlp_results
-- Created at: 1757821095

ALTER TABLE nlp_analysis_results ADD COLUMN IF NOT EXISTS text_input TEXT;;