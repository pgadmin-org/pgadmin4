-- Constraint: Chk_$%{}[]()&*^!@"'`\/#

-- ALTER TABLE IF EXISTS testschema.tableforcon DROP CONSTRAINT IF EXISTS "Chk_$%{}[]()&*^!@""'`\/#";

ALTER TABLE IF EXISTS testschema.tableforcon
    ADD CONSTRAINT "Chk_$%{}[]()&*^!@""'`\/#" CHECK (col1 > 1)
    NOT VALID;

COMMENT ON CONSTRAINT "Chk_$%{}[]()&*^!@""'`\/#" ON testschema.tableforcon
    IS 'Comment for create';
