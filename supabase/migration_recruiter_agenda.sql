CREATE TABLE IF NOT EXISTS recruiter_agenda_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL CHECK (kind IN ('task', 'event')),
  title text NOT NULL CHECK (length(trim(title)) > 0),
  notes text,
  item_date date,
  start_time time,
  end_time time,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agenda_event_has_slot CHECK (kind <> 'event' OR (item_date IS NOT NULL AND start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time))
);

CREATE INDEX IF NOT EXISTS recruiter_agenda_user_date_idx ON recruiter_agenda_items(user_id, item_date);

-- Personal agenda: every user sees and edits only their own items.
ALTER TABLE recruiter_agenda_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner only" ON recruiter_agenda_items;
CREATE POLICY "Owner only" ON recruiter_agenda_items FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
