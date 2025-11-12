-- Constraint: Pk_$%{}[]()&*^!@"'`\/#

-- ALTER TABLE IF EXISTS testschema.tablefor_primary_key_cons DROP CONSTRAINT IF EXISTS "Pk_$%{}[]()&*^!@""'`\/#";

ALTER TABLE IF EXISTS testschema.tablefor_primary_key_cons
    ADD CONSTRAINT "Pk_$%{}[]()&*^!@""'`\/#" PRIMARY KEY (col1)
    WITH (FILLFACTOR=20);

COMMENT ON CONSTRAINT "Pk_$%{}[]()&*^!@""'`\/#" ON testschema.tablefor_primary_key_cons
    IS 'Comment for create';
