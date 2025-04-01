ALTER TABLE testschema.tablefor_primary_key_cons
    RENAME CONSTRAINT "Pk_$%{}[]()&*^!@""'`\/#" TO "Pk_$%{}[]()&*^!@""'`\/#a";
ALTER INDEX testschema."Pk_$%{}[]()&*^!@""'`\/#a"
    SET (FILLFACTOR=90);
COMMENT ON CONSTRAINT "Pk_$%{}[]()&*^!@""'`\/#a" ON testschema.tablefor_primary_key_cons
    IS 'Comment for alter';
