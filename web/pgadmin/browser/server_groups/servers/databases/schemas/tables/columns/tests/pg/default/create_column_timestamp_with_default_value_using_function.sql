-- Column: testschema."table_2_$%{}[]()&*^!@""'`\/#"."col__2_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE IF EXISTS testschema."table_2_$%{}[]()&*^!@""'`\/#" DROP COLUMN IF EXISTS "col__2_$%{}[]()&*^!@""'`\/#";

ALTER TABLE IF EXISTS testschema."table_2_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN IF NOT EXISTS "col__2_$%{}[]()&*^!@""'`\/#" time(4) with time zone DEFAULT now();

COMMENT ON COLUMN testschema."table_2_$%{}[]()&*^!@""'`\/#"."col__2_$%{}[]()&*^!@""'`\/#"
    IS 'test comment';
