-- Column: testschema."table_3_$%{}[]()&*^!@""'`\/#"."new_col_1_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#" DROP COLUMN IF EXISTS "new_col_1_$%{}[]()&*^!@""'`\/#";

ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "new_col_1_$%{}[]()&*^!@""'`\/#" real NOT NULL DEFAULT 1;

COMMENT ON COLUMN testschema."table_3_$%{}[]()&*^!@""'`\/#"."new_col_1_$%{}[]()&*^!@""'`\/#"
    IS 'Comment for alter';

GRANT ALL("new_col_1_$%{}[]()&*^!@""'`\/#") ON testschema."table_3_$%{}[]()&*^!@""'`\/#" TO PUBLIC;
