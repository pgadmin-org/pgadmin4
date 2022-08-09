-- Column: testschema."table_2_$%{}[]()&*^!@""'`\/#"."new_col_5_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE IF EXISTS testschema."table_2_$%{}[]()&*^!@""'`\/#" DROP COLUMN IF EXISTS "new_col_5_$%{}[]()&*^!@""'`\/#";

ALTER TABLE IF EXISTS testschema."table_2_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN IF NOT EXISTS "new_col_5_$%{}[]()&*^!@""'`\/#" bigint NOT NULL;

COMMENT ON COLUMN testschema."table_2_$%{}[]()&*^!@""'`\/#"."new_col_5_$%{}[]()&*^!@""'`\/#"
    IS 'Comment for alter';
