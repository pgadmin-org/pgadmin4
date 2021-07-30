-- Column: testschema."table_3_$%{}[]()&*^!@""'`\/#"."new_col_4_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#" DROP COLUMN IF EXISTS "new_col_4_$%{}[]()&*^!@""'`\/#";

ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "new_col_4_$%{}[]()&*^!@""'`\/#" bigint GENERATED ALWAYS AS (((1 + 2) + 3)) STORED;

COMMENT ON COLUMN testschema."table_3_$%{}[]()&*^!@""'`\/#"."new_col_4_$%{}[]()&*^!@""'`\/#"
    IS 'Comment for alter';

GRANT INSERT("new_col_4_$%{}[]()&*^!@""'`\/#"), SELECT("new_col_4_$%{}[]()&*^!@""'`\/#"), REFERENCES("new_col_4_$%{}[]()&*^!@""'`\/#") ON testschema."table_3_$%{}[]()&*^!@""'`\/#" TO PUBLIC;
