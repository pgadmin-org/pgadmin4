-- Column: testschema."table_3_$%{}[]()&*^!@""'`\/#"."col_1_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#" DROP COLUMN IF EXISTS "col_1_$%{}[]()&*^!@""'`\/#";

ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "col_1_$%{}[]()&*^!@""'`\/#" bigint NOT NULL DEFAULT 1;

COMMENT ON COLUMN testschema."table_3_$%{}[]()&*^!@""'`\/#"."col_1_$%{}[]()&*^!@""'`\/#"
    IS 'Comment for create';
