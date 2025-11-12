ALTER TABLE IF EXISTS testschema.tablefor_unique_cons
    ADD CONSTRAINT "UC_$%{}[]()&*^!@""'`\/#" UNIQUE (col1)
    WITH (FILLFACTOR=20)
    DEFERRABLE INITIALLY DEFERRED;

COMMENT ON CONSTRAINT "UC_$%{}[]()&*^!@""'`\/#" ON testschema.tablefor_unique_cons
    IS 'Comment for create';
