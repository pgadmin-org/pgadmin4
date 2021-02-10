-- Column: testschema."table_2_$%{}[]()&*^!@""'`\/#"."new_col_1_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE testschema."table_2_$%{}[]()&*^!@""'`\/#" DROP COLUMN "new_col_1_$%{}[]()&*^!@""'`\/#";

ALTER TABLE testschema."table_2_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "new_col_1_$%{}[]()&*^!@""'`\/#" real NOT NULL DEFAULT 1;

COMMENT ON COLUMN testschema."table_2_$%{}[]()&*^!@""'`\/#"."new_col_1_$%{}[]()&*^!@""'`\/#"
    IS 'Comment for alter';

GRANT ALL("new_col_1_$%{}[]()&*^!@""'`\/#") ON testschema."table_2_$%{}[]()&*^!@""'`\/#" TO PUBLIC;
