ALTER TABLE testschema.tableforindexcon
    ADD CONSTRAINT "Pk_$%{}[]()&*^!@""'`\/#" PRIMARY KEY (col1)
    WITH (FILLFACTOR=20)
    DEFERRABLE INITIALLY DEFERRED;

COMMENT ON CONSTRAINT "Pk_$%{}[]()&*^!@""'`\/#" ON testschema.tableforindexcon
    IS 'Comment for create';
