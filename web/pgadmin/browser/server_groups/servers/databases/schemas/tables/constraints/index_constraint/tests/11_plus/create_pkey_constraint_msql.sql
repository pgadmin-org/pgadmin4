ALTER TABLE IF EXISTS testschema.tablefor_primary_key_cons
    ADD CONSTRAINT "Pk_$%{}[]()&*^!@""'`\/#" PRIMARY KEY (col1)
    INCLUDE (col2)
    WITH (FILLFACTOR=20)
    DEFERRABLE INITIALLY DEFERRED;

COMMENT ON CONSTRAINT "Pk_$%{}[]()&*^!@""'`\/#" ON testschema.tablefor_primary_key_cons
    IS 'Comment for create';
