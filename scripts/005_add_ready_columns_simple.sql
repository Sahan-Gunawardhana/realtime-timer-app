-- Add missing ready columns to existing floor_status table
-- Run this in Supabase SQL Editor

-- Add is_ready column
ALTER TABLE floor_status ADD COLUMN IF NOT EXISTS is_ready BOOLEAN NOT NULL DEFAULT FALSE;

-- Add ready_at column  
ALTER TABLE floor_status ADD COLUMN IF NOT EXISTS ready_at TIMESTAMP WITH TIME ZONE;

-- Add index for ready status
CREATE INDEX IF NOT EXISTS idx_floor_status_ready ON floor_status(is_ready);

-- Update existing records to have default ready status
UPDATE floor_status SET is_ready = FALSE WHERE is_ready IS NULL;
UPDATE floor_status SET ready_at = NULL WHERE ready_at IS NULL;