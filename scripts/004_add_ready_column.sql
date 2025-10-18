-- Add is_ready column if it doesn't exist (migration script)
DO $$ 
BEGIN
    -- Check if is_ready column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'floor_status' 
        AND column_name = 'is_ready'
    ) THEN
        ALTER TABLE floor_status ADD COLUMN is_ready BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
    
    -- Check if ready_at column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'floor_status' 
        AND column_name = 'ready_at'
    ) THEN
        ALTER TABLE floor_status ADD COLUMN ready_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Update existing records to have default ready status
UPDATE floor_status 
SET is_ready = FALSE, ready_at = NULL 
WHERE is_ready IS NULL;