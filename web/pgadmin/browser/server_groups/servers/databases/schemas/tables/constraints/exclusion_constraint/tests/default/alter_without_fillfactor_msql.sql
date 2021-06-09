ALTER TABLE testschema.tableforexclusion
    RENAME CONSTRAINT "Exclusion_$%{}[]()&*^!@""'`\/#_1" TO "Exclusion_$%{}[]()&*^!@""'`\/#_1a";
ALTER INDEX testschema."Exclusion_$%{}[]()&*^!@""'`\/#_1a"
    RESET (FILLFACTOR);
COMMENT ON CONSTRAINT "Exclusion_$%{}[]()&*^!@""'`\/#_1a" ON testschema.tableforexclusion
    IS 'Comment for alter';
