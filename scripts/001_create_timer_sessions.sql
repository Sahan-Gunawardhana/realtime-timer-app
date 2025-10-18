-- Create timer_sessions table for storing shared timer state
CREATE TABLE IF NOT EXISTS public.timer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code TEXT UNIQUE NOT NULL,
  initial_time_seconds INTEGER NOT NULL,
  time_left_seconds INTEGER NOT NULL,
  is_running BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.timer_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view timer sessions (no auth required for game)
CREATE POLICY "Allow public read access" ON public.timer_sessions
  FOR SELECT USING (true);

-- Allow anyone to update timer sessions
CREATE POLICY "Allow public update access" ON public.timer_sessions
  FOR UPDATE USING (true);

-- Allow anyone to insert timer sessions
CREATE POLICY "Allow public insert access" ON public.timer_sessions
  FOR INSERT WITH CHECK (true);

-- Create index on session_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_timer_sessions_code ON public.timer_sessions(session_code);
