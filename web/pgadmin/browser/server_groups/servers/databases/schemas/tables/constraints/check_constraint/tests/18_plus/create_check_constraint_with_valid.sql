-- Constraint: Chk_valid_$%{}[]()&*^!@"'`\/#

-- ALTER TABLE IF EXISTS testschema.tableforcon DROP CONSTRAINT IF EXISTS "Chk_valid_$%{}[]()&*^!@""'`\/#";

ALTER TABLE IF EXISTS testschema.tableforcon
    ADD CONSTRAINT "Chk_valid_$%{}[]()&*^!@""'`\/#" CHECK (col1 > 200) NO INHERIT;

COMMENT ON CONSTRAINT "Chk_valid_$%{}[]()&*^!@""'`\/#" ON testschema.tableforcon
    IS 'Comment for create';
