-- Column: testschema."table_3_$%{}[]()&*^!@""'`\/#"."new_col_2_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE testschema."table_3_$%{}[]()&*^!@""'`\/#" DROP COLUMN "new_col_2_$%{}[]()&*^!@""'`\/#";

ALTER TABLE testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "new_col_2_$%{}[]()&*^!@""'`\/#" character(1) COLLATE pg_catalog."C";

COMMENT ON COLUMN testschema."table_3_$%{}[]()&*^!@""'`\/#"."new_col_2_$%{}[]()&*^!@""'`\/#"
    IS 'Comment for alter';

ALTER TABLE testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ALTER COLUMN "new_col_2_$%{}[]()&*^!@""'`\/#" SET STATISTICS 5;

ALTER TABLE testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ALTER COLUMN "new_col_2_$%{}[]()&*^!@""'`\/#" SET STORAGE PLAIN;

GRANT INSERT("new_col_2_$%{}[]()&*^!@""'`\/#"), SELECT("new_col_2_$%{}[]()&*^!@""'`\/#"), REFERENCES("new_col_2_$%{}[]()&*^!@""'`\/#") ON testschema."table_3_$%{}[]()&*^!@""'`\/#" TO PUBLIC;
