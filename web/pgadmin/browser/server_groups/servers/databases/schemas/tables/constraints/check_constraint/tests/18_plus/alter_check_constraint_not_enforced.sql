-- Constraint: Chk_enforced

-- ALTER TABLE IF EXISTS testschema.tableforcon DROP CONSTRAINT IF EXISTS "Chk_enforced";

ALTER TABLE IF EXISTS testschema.tableforcon
    ADD CONSTRAINT "Chk_enforced" CHECK (col1 > 5)
    NOT ENFORCED;

COMMENT ON CONSTRAINT "Chk_enforced" ON testschema.tableforcon
    IS 'Comment for not enforced';
