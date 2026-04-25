-- Fix missing columns in contracts table
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;
