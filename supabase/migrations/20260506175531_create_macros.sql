-- Supabase macros table
CREATE TABLE macros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  dice_expression TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE macros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own macros"
  ON macros FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
