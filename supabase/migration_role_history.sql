-- Role history: tracks status changes and key field updates on roles
CREATE TABLE IF NOT EXISTS role_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id     uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  changed_at  timestamptz NOT NULL DEFAULT now(),
  field       text NOT NULL,          -- e.g. 'status', 'title', 'deadline'
  old_value   text,
  new_value   text,
  note        text                    -- optional manual note
);

CREATE INDEX IF NOT EXISTS idx_role_history_role_id ON role_history(role_id);
CREATE INDEX IF NOT EXISTS idx_role_history_changed_at ON role_history(changed_at DESC);
