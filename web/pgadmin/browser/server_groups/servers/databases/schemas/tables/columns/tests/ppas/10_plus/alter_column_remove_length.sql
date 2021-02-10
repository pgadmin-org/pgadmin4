-- Column: testschema."table_2_$%{}[]()&*^!@""'`\/#"."new_col_4_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE testschema."table_2_$%{}[]()&*^!@""'`\/#" DROP COLUMN "new_col_4_$%{}[]()&*^!@""'`\/#";

ALTER TABLE testschema."table_2_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "new_col_4_$%{}[]()&*^!@""'`\/#" numeric NOT NULL;

COMMENT ON COLUMN testschema."table_2_$%{}[]()&*^!@""'`\/#"."new_col_4_$%{}[]()&*^!@""'`\/#"
    IS 'Comment for alter';

ALTER TABLE testschema."table_2_$%{}[]()&*^!@""'`\/#"
    ALTER COLUMN "new_col_4_$%{}[]()&*^!@""'`\/#"
    SET (n_distinct=1);

GRANT ALL("new_col_4_$%{}[]()&*^!@""'`\/#") ON testschema."table_2_$%{}[]()&*^!@""'`\/#" TO PUBLIC;
