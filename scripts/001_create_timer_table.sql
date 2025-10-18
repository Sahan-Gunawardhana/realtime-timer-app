CREATE TABLE IF NOT EXISTS global_timer (
  id BIGINT PRIMARY KEY DEFAULT 1,
  total_seconds INT NOT NULL DEFAULT 1500,
  remaining_seconds INT NOT NULL DEFAULT 1500,
  is_running BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT only_one_row CHECK (id = 1)
);

ALTER TABLE global_timer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON global_timer FOR SELECT USING (true);
CREATE POLICY "Allow public update" ON global_timer FOR UPDATE USING (true);
CREATE POLICY "Allow public insert" ON global_timer FOR INSERT WITH CHECK (true);

INSERT INTO global_timer (id, total_seconds, remaining_seconds, is_running, started_at)
VALUES (1, 1500, 1500, FALSE, NULL)
ON CONFLICT (id) DO NOTHING;
