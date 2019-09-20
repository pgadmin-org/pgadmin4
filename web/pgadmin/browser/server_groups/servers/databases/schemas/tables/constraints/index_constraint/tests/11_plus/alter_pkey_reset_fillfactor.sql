-- Constraint: Pk_$%{}[]()&*^!@"'`\/#a

-- ALTER TABLE testschema.tablefor_primary_key_cons DROP CONSTRAINT "Pk_$%{}[]()&*^!@""'`\/#a";

ALTER TABLE testschema.tablefor_primary_key_cons
    ADD CONSTRAINT "Pk_$%{}[]()&*^!@""'`\/#a" PRIMARY KEY (col1)
    INCLUDE (col2)
    DEFERRABLE INITIALLY DEFERRED;

COMMENT ON CONSTRAINT "Pk_$%{}[]()&*^!@""'`\/#a" ON testschema.tablefor_primary_key_cons
    IS 'Comment for alter';

