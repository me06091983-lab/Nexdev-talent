-- Adaugă câmpul hiring_manager pe tabelul roles
ALTER TABLE roles ADD COLUMN IF NOT EXISTS hiring_manager text;
