-- Column: testschema."table_1_$%{}[]()&*^!@""'`\/#"."new_col_1_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE testschema."table_1_$%{}[]()&*^!@""'`\/#" DROP COLUMN "new_col_1_$%{}[]()&*^!@""'`\/#";

ALTER TABLE testschema."table_1_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "new_col_1_$%{}[]()&*^!@""'`\/#" real NOT NULL DEFAULT 1;

COMMENT ON COLUMN testschema."table_1_$%{}[]()&*^!@""'`\/#"."new_col_1_$%{}[]()&*^!@""'`\/#"
    IS 'Comment for alter';

GRANT ALL("new_col_1_$%{}[]()&*^!@""'`\/#") ON testschema."table_1_$%{}[]()&*^!@""'`\/#" TO PUBLIC;

GRANT INSERT("new_col_1_$%{}[]()&*^!@""'`\/#"), SELECT("new_col_1_$%{}[]()&*^!@""'`\/#") ON testschema."table_1_$%{}[]()&*^!@""'`\/#" TO enterprisedb;
