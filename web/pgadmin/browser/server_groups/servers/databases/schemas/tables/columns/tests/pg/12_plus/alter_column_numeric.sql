-- Column: testschema."table_3_$%{}[]()&*^!@""'`\/#"."new_col_5_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE testschema."table_3_$%{}[]()&*^!@""'`\/#" DROP COLUMN "new_col_5_$%{}[]()&*^!@""'`\/#";

ALTER TABLE testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "new_col_5_$%{}[]()&*^!@""'`\/#" numeric(15,6) NOT NULL;

COMMENT ON COLUMN testschema."table_3_$%{}[]()&*^!@""'`\/#"."new_col_5_$%{}[]()&*^!@""'`\/#"
    IS 'Comment for alter';

ALTER TABLE testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ALTER COLUMN "new_col_5_$%{}[]()&*^!@""'`\/#"
    SET (n_distinct=1);

GRANT ALL("new_col_5_$%{}[]()&*^!@""'`\/#") ON testschema."table_3_$%{}[]()&*^!@""'`\/#" TO PUBLIC;
