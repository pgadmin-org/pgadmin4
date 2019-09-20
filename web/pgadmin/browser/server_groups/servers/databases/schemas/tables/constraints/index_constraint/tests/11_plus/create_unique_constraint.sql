-- Constraint: UC_$%{}[]()&*^!@"'`\/#

-- ALTER TABLE testschema.tablefor_unique_cons DROP CONSTRAINT "UC_$%{}[]()&*^!@""'`\/#";

ALTER TABLE testschema.tablefor_unique_cons
    ADD CONSTRAINT "UC_$%{}[]()&*^!@""'`\/#" UNIQUE (col1)
    INCLUDE (col2)
    WITH (FILLFACTOR=20)
    DEFERRABLE INITIALLY DEFERRED;

COMMENT ON CONSTRAINT "UC_$%{}[]()&*^!@""'`\/#" ON testschema.tablefor_unique_cons
    IS 'Comment for create';
