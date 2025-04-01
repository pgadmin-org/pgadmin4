ALTER TABLE testschema.tablefor_unique_cons
    RENAME CONSTRAINT "UC_$%{}[]()&*^!@""'`\/#" TO "UC_$%{}[]()&*^!@""'`\/#a";
ALTER INDEX testschema."UC_$%{}[]()&*^!@""'`\/#a"
    SET (FILLFACTOR=90);
COMMENT ON CONSTRAINT "UC_$%{}[]()&*^!@""'`\/#a" ON testschema.tablefor_unique_cons
    IS 'Comment for alter';
