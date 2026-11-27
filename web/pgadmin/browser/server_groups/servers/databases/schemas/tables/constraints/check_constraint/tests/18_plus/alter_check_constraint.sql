-- Constraint: Chk_$%{}[]()&*^!@"'`\/#a

-- ALTER TABLE IF EXISTS testschema.tableforcon DROP CONSTRAINT IF EXISTS "Chk_$%{}[]()&*^!@""'`\/#a";

ALTER TABLE IF EXISTS testschema.tableforcon
    ADD CONSTRAINT "Chk_$%{}[]()&*^!@""'`\/#a" CHECK (col1 > 1);

COMMENT ON CONSTRAINT "Chk_$%{}[]()&*^!@""'`\/#a" ON testschema.tableforcon
    IS 'Comment for alter';
