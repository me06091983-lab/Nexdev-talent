-- Candidate status is derived automatically:
--   blacklist -> never changed automatically (manual only)
--   angajat   -> has an active contract
--   activ     -> submitted to an active role with submission status pipeline/submitted/shortlisted/interview/offer
--   pasiv     -> everything else
-- SECURITY DEFINER so contracts (admin-only RLS) are visible even when a recruiter triggers the change.

CREATE OR REPLACE FUNCTION public.recompute_candidate_status(cid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_status text;
  next_status text;
BEGIN
  IF cid IS NULL THEN RETURN; END IF;

  SELECT candidate_status INTO current_status FROM candidates WHERE id = cid AND deleted_at IS NULL;
  IF NOT FOUND OR current_status = 'blacklist' THEN RETURN; END IF;

  IF EXISTS (SELECT 1 FROM contracts k WHERE k.candidate_id = cid AND k.contract_status = 'activ') THEN
    next_status := 'angajat';
  ELSIF EXISTS (
    SELECT 1 FROM submissions s JOIN roles r ON r.id = s.role_id
    WHERE s.candidate_id = cid
      AND s.deleted_at IS NULL
      AND r.deleted_at IS NULL
      AND r.status = 'active'
      AND s.status IN ('pipeline', 'submitted', 'shortlisted', 'interview', 'offer')
  ) THEN
    next_status := 'activ';
  ELSE
    next_status := 'pasiv';
  END IF;

  IF next_status IS DISTINCT FROM current_status THEN
    UPDATE candidates SET candidate_status = next_status WHERE id = cid;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_candidate_status(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_submissions_candidate_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN PERFORM recompute_candidate_status(OLD.candidate_id); END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND (TG_OP = 'INSERT' OR NEW.candidate_id IS DISTINCT FROM OLD.candidate_id) THEN
    PERFORM recompute_candidate_status(NEW.candidate_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS submissions_candidate_status ON submissions;
CREATE TRIGGER submissions_candidate_status
AFTER INSERT OR DELETE OR UPDATE OF status, deleted_at, role_id, candidate_id ON submissions
FOR EACH ROW EXECUTE FUNCTION trg_submissions_candidate_status();

CREATE OR REPLACE FUNCTION public.trg_contracts_candidate_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN PERFORM recompute_candidate_status(OLD.candidate_id); END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND (TG_OP = 'INSERT' OR NEW.candidate_id IS DISTINCT FROM OLD.candidate_id) THEN
    PERFORM recompute_candidate_status(NEW.candidate_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS contracts_candidate_status ON contracts;
CREATE TRIGGER contracts_candidate_status
AFTER INSERT OR DELETE OR UPDATE OF contract_status, candidate_id ON contracts
FOR EACH ROW EXECUTE FUNCTION trg_contracts_candidate_status();

CREATE OR REPLACE FUNCTION public.trg_roles_candidate_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid;
BEGIN
  FOR cid IN SELECT DISTINCT candidate_id FROM submissions WHERE role_id = NEW.id LOOP
    PERFORM recompute_candidate_status(cid);
  END LOOP;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS roles_candidate_status ON roles;
CREATE TRIGGER roles_candidate_status
AFTER UPDATE OF status, deleted_at ON roles
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
EXECUTE FUNCTION trg_roles_candidate_status();

-- One-off backfill so existing data follows the rules.
DO $$
DECLARE cid uuid;
BEGIN
  FOR cid IN SELECT id FROM candidates WHERE deleted_at IS NULL LOOP
    PERFORM recompute_candidate_status(cid);
  END LOOP;
END $$;
