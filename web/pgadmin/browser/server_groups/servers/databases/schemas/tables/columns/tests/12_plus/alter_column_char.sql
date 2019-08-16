-- Column: testschema."table_3_$%{}[]()&*^!@""'`\/#"."new_col_2_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE testschema."table_3_$%{}[]()&*^!@""'`\/#" DROP COLUMN "new_col_2_$%{}[]()&*^!@""'`\/#";

ALTER TABLE testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "new_col_2_$%{}[]()&*^!@""'`\/#" character(50) COLLATE pg_catalog."C";

COMMENT ON COLUMN testschema."table_3_$%{}[]()&*^!@""'`\/#"."new_col_2_$%{}[]()&*^!@""'`\/#"
    IS 'Comment for alter';

GRANT INSERT("new_col_2_$%{}[]()&*^!@""'`\/#"), SELECT("new_col_2_$%{}[]()&*^!@""'`\/#"), REFERENCES("new_col_2_$%{}[]()&*^!@""'`\/#") ON testschema."table_3_$%{}[]()&*^!@""'`\/#" TO PUBLIC;
