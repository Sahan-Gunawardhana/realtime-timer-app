-- Create floor status table for tracking ready and completion status
CREATE TABLE IF NOT EXISTS floor_status (
  id TEXT PRIMARY KEY,
  floor_name TEXT NOT NULL,
  is_ready BOOLEAN NOT NULL DEFAULT FALSE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ready_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE floor_status ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read" ON floor_status FOR SELECT USING (true);
CREATE POLICY "Allow public update" ON floor_status FOR UPDATE USING (true);
CREATE POLICY "Allow public insert" ON floor_status FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public upsert" ON floor_status FOR ALL USING (true);

-- Insert default floor statuses
INSERT INTO floor_status (id, floor_name, is_ready, is_completed, ready_at, completed_at)
VALUES 
  ('basement', 'Basement', FALSE, FALSE, NULL, NULL),
  ('1st_floor', '1st Floor', FALSE, FALSE, NULL, NULL),
  ('2nd_floor', '2nd Floor', FALSE, FALSE, NULL, NULL),
  ('right', 'Right', FALSE, FALSE, NULL, NULL),
  ('wrong', 'Wrong', FALSE, FALSE, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE floor_status;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_floor_status_updated_at ON floor_status(updated_at);
CREATE INDEX IF NOT EXISTS idx_floor_status_completed ON floor_status(is_completed);