-- Create active_rooms table
CREATE TABLE active_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin VARCHAR(4) NOT NULL UNIQUE,
  host_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);

-- Enable RLS
ALTER TABLE active_rooms ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Anyone can read rooms (needed for joining via PIN)
CREATE POLICY "Anyone can select active_rooms"
  ON active_rooms FOR SELECT
  USING (true);

-- Hosts can create rooms
CREATE POLICY "Hosts can insert active_rooms"
  ON active_rooms FOR INSERT
  WITH CHECK (true);

-- Hosts can update their own rooms
CREATE POLICY "Hosts can update their own rooms"
  ON active_rooms FOR UPDATE
  USING (host_id = auth.uid());

-- Hosts can delete their own rooms
CREATE POLICY "Hosts can delete their own rooms"
  ON active_rooms FOR DELETE
  USING (host_id = auth.uid());
