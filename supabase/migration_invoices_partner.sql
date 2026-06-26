-- Adaugă coloana partner_id la manual_invoices
-- Permite legarea unei facturi primite de un partener (în loc de candidat/contract)

ALTER TABLE manual_invoices
ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES partners(id) ON DELETE SET NULL;
