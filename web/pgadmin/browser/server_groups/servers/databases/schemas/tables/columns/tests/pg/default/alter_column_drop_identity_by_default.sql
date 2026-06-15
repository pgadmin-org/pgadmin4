-- Column: testschema."table_3_$%{}[]()&*^!@""'`\/#"."new_col_9_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#" DROP COLUMN IF EXISTS "new_col_9_$%{}[]()&*^!@""'`\/#";

ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "new_col_9_$%{}[]()&*^!@""'`\/#" bigint NOT NULL;

COMMENT ON COLUMN testschema."table_3_$%{}[]()&*^!@""'`\/#"."new_col_9_$%{}[]()&*^!@""'`\/#"
    IS 'Comment for alter';
