ALTER TABLE testschema.tableforindexcon
    RENAME CONSTRAINT "Pk_$%{}[]()&*^!@""'`\/#" TO "Pk_$%{}[]()&*^!@""'`\/#a";
ALTER INDEX testschema."Pk_$%{}[]()&*^!@""'`\/#a"
    SET (FILLFACTOR=90);
COMMENT ON CONSTRAINT "Pk_$%{}[]()&*^!@""'`\/#a" ON testschema.tableforindexcon
    IS 'Comment for alter';
