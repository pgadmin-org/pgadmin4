-- Constraint: Pk_$%{}[]()&*^!@"'`\/#a

-- ALTER TABLE IF EXISTS testschema.tablefor_primary_key_cons DROP CONSTRAINT IF EXISTS "Pk_$%{}[]()&*^!@""'`\/#a";

ALTER TABLE IF EXISTS testschema.tablefor_primary_key_cons
    ADD CONSTRAINT "Pk_$%{}[]()&*^!@""'`\/#a" PRIMARY KEY (col1)
    INCLUDE (col2)
    WITH (FILLFACTOR=90)
    DEFERRABLE INITIALLY DEFERRED;

COMMENT ON CONSTRAINT "Pk_$%{}[]()&*^!@""'`\/#a" ON testschema.tablefor_primary_key_cons
    IS 'Comment for alter';

