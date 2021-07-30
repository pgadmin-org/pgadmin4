-- Constraint: UC_$%{}[]()&*^!@"'`\/#a

-- ALTER TABLE IF EXISTS testschema.tablefor_unique_cons DROP CONSTRAINT IF EXISTS "UC_$%{}[]()&*^!@""'`\/#a";

ALTER TABLE IF EXISTS testschema.tablefor_unique_cons
    ADD CONSTRAINT "UC_$%{}[]()&*^!@""'`\/#a" UNIQUE (col1)
    WITH (FILLFACTOR=90)
    DEFERRABLE INITIALLY DEFERRED;

COMMENT ON CONSTRAINT "UC_$%{}[]()&*^!@""'`\/#a" ON testschema.tablefor_unique_cons
    IS 'Comment for alter';
