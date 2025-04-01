ALTER TABLE IF EXISTS testschema.tableforexclusion
    RENAME CONSTRAINT "Exclusion_$%{}[]()&*^!@""'`\/#" TO "Exclusion_$%{}[]()&*^!@""'`\/#a";
ALTER INDEX IF EXISTS testschema."Exclusion_$%{}[]()&*^!@""'`\/#a"
    SET (FILLFACTOR=98);
COMMENT ON CONSTRAINT "Exclusion_$%{}[]()&*^!@""'`\/#a" ON testschema.tableforexclusion
    IS 'Comment for alter';
