-- Column: testschema."table_3_$%{}[]()&*^!@""'`\/#"."new_col_3_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE testschema."table_3_$%{}[]()&*^!@""'`\/#" DROP COLUMN "new_col_3_$%{}[]()&*^!@""'`\/#";

ALTER TABLE testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "new_col_3_$%{}[]()&*^!@""'`\/#" bigint NOT NULL;

COMMENT ON COLUMN testschema."table_3_$%{}[]()&*^!@""'`\/#"."new_col_3_$%{}[]()&*^!@""'`\/#"
    IS 'Comment for alter';

GRANT INSERT("new_col_3_$%{}[]()&*^!@""'`\/#"), SELECT("new_col_3_$%{}[]()&*^!@""'`\/#"), REFERENCES("new_col_3_$%{}[]()&*^!@""'`\/#") ON testschema."table_3_$%{}[]()&*^!@""'`\/#" TO PUBLIC;
