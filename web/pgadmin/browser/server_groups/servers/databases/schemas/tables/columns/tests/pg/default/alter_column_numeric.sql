-- Column: testschema."table_1_$%{}[]()&*^!@""'`\/#"."new_col_3_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE testschema."table_1_$%{}[]()&*^!@""'`\/#" DROP COLUMN "new_col_3_$%{}[]()&*^!@""'`\/#";

ALTER TABLE testschema."table_1_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "new_col_3_$%{}[]()&*^!@""'`\/#" numeric(15,6) NOT NULL;

COMMENT ON COLUMN testschema."table_1_$%{}[]()&*^!@""'`\/#"."new_col_3_$%{}[]()&*^!@""'`\/#"
    IS 'Comment for alter';

ALTER TABLE testschema."table_1_$%{}[]()&*^!@""'`\/#"
    ALTER COLUMN "new_col_3_$%{}[]()&*^!@""'`\/#"
    SET (n_distinct=1);

GRANT ALL("new_col_3_$%{}[]()&*^!@""'`\/#") ON testschema."table_1_$%{}[]()&*^!@""'`\/#" TO PUBLIC;
