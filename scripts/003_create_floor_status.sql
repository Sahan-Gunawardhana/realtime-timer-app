-- Create floor status table for tracking completion status
CREATE TABLE IF NOT EXISTS floor_status (
  id TEXT PRIMARY KEY,
  floor_name TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
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
INSERT INTO floor_status (id, floor_name, is_completed, completed_at)
VALUES 
  ('basement', 'Basement', FALSE, NULL),
  ('1st_floor', '1st Floor', FALSE, NULL),
  ('2nd_floor', '2nd Floor', FALSE, NULL),
  ('right', 'Right', FALSE, NULL),
  ('wrong', 'Wrong', FALSE, NULL)
ON CONFLICT (id) DO NOTHING;

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE floor_status;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_floor_status_updated_at ON floor_status(updated_at);
CREATE INDEX IF NOT EXISTS idx_floor_status_completed ON floor_status(is_completed);