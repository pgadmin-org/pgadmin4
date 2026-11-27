-- Constraint: uc_temporal

-- ALTER TABLE IF EXISTS testschema.tablefor_temporal_cons DROP CONSTRAINT IF EXISTS uc_temporal;

ALTER TABLE IF EXISTS testschema.tablefor_temporal_cons
    ADD CONSTRAINT uc_temporal UNIQUE (valid_at, room WITHOUT OVERLAPS)
    WITH (FILLFACTOR=80);
