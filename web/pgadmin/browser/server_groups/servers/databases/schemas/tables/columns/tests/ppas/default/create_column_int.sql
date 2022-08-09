-- Column: testschema."table_2_$%{}[]()&*^!@""'`\/#"."col_1_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE IF EXISTS testschema."table_2_$%{}[]()&*^!@""'`\/#" DROP COLUMN IF EXISTS "col_1_$%{}[]()&*^!@""'`\/#";

ALTER TABLE IF EXISTS testschema."table_2_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN IF NOT EXISTS "col_1_$%{}[]()&*^!@""'`\/#" bigint NOT NULL DEFAULT 1;

COMMENT ON COLUMN testschema."table_2_$%{}[]()&*^!@""'`\/#"."col_1_$%{}[]()&*^!@""'`\/#"
    IS 'Comment for create';
