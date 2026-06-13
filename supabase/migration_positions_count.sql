-- Add positions_count column to roles table
ALTER TABLE roles ADD COLUMN IF NOT EXISTS positions_count integer NOT NULL DEFAULT 1;
