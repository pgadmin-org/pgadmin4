-- Column: testschema."table_3_$%{}[]()&*^!@""'`\/#"."col__2_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#" DROP COLUMN IF EXISTS "col__2_$%{}[]()&*^!@""'`\/#";

ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "col__2_$%{}[]()&*^!@""'`\/#" time(6) with time zone NOT NULL DEFAULT now();

COMMENT ON COLUMN testschema."table_3_$%{}[]()&*^!@""'`\/#"."col__2_$%{}[]()&*^!@""'`\/#"
    IS 'test comment modification';
