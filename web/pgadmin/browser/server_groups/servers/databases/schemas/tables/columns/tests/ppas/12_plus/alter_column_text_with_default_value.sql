-- Column: testschema."table_3_$%{}[]()&*^!@""'`\/#"."col__1_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#" DROP COLUMN IF EXISTS "col__1_$%{}[]()&*^!@""'`\/#";

ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "col__1_$%{}[]()&*^!@""'`\/#" text COLLATE pg_catalog."default" DEFAULT 'changed default value'::text;

COMMENT ON COLUMN testschema."table_3_$%{}[]()&*^!@""'`\/#"."col__1_$%{}[]()&*^!@""'`\/#"
    IS 'test comment';

GRANT SELECT("col__1_$%{}[]()&*^!@""'`\/#") ON testschema."table_3_$%{}[]()&*^!@""'`\/#" TO PUBLIC;
