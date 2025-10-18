-- Enable real-time for the global_timer table
ALTER PUBLICATION supabase_realtime ADD TABLE global_timer;

-- Ensure the table has proper indexing for real-time performance
CREATE INDEX IF NOT EXISTS idx_global_timer_id ON global_timer(id);
CREATE INDEX IF NOT EXISTS idx_global_timer_updated_at ON global_timer(updated_at);