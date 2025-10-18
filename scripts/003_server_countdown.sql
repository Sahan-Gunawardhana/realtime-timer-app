-- Create a function to update timer countdown
CREATE OR REPLACE FUNCTION update_timer_countdown()
RETURNS void AS $$
DECLARE
    timer_row global_timer%ROWTYPE;
    elapsed_seconds INTEGER;
    remaining_seconds INTEGER;
BEGIN
    -- Get the current timer
    SELECT * INTO timer_row FROM global_timer WHERE id = 1;
    
    -- Only process if timer is running
    IF timer_row.is_running AND timer_row.started_at IS NOT NULL THEN
        -- Calculate elapsed time
        elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - timer_row.started_at))::INTEGER;
        remaining_seconds := GREATEST(0, timer_row.total_seconds - elapsed_seconds);
        
        -- Update the timer
        UPDATE global_timer 
        SET 
            remaining_seconds = remaining_seconds,
            updated_at = NOW(),
            is_running = CASE WHEN remaining_seconds > 0 THEN true ELSE false END,
            started_at = CASE WHEN remaining_seconds > 0 THEN timer_row.started_at ELSE NULL END
        WHERE id = 1;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update countdown every second
-- Note: This requires pg_cron extension which may not be available on Supabase
-- Instead, we'll rely on client-side calculation with server timestamp