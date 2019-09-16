-- Constraint: Pk_$%{}[]()&*^!@"'`\/#a

-- ALTER TABLE testschema.tableforindexcon DROP CONSTRAINT "Pk_$%{}[]()&*^!@""'`\/#a";

ALTER TABLE testschema.tableforindexcon
    ADD CONSTRAINT "Pk_$%{}[]()&*^!@""'`\/#a" PRIMARY KEY (col1)
    WITH (FILLFACTOR=90);

COMMENT ON CONSTRAINT "Pk_$%{}[]()&*^!@""'`\/#a" ON testschema.tableforindexcon
    IS 'Comment for alter';

