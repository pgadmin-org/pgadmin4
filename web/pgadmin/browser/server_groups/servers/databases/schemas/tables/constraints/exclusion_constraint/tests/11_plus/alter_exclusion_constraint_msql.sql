ALTER TABLE testschema.tableforexclusion
    RENAME CONSTRAINT "Exclusion_$%{}[]()&*^!@""'`\/#" TO "Exclusion_$%{}[]()&*^!@""'`\/#a";
ALTER INDEX testschema."Exclusion_$%{}[]()&*^!@""'`\/#a"
    SET (FILLFACTOR=98);
COMMENT ON CONSTRAINT "Exclusion_$%{}[]()&*^!@""'`\/#a" ON testschema.tableforexclusion
    IS 'Comment for alter';
