-- Column: testschema."table_2_$%{}[]()&*^!@""'`\/#"."col__1_$%{}[]&*^!@""'`\/#"

-- ALTER TABLE testschema."table_2_$%{}[]()&*^!@""'`\/#" DROP COLUMN "col__1_$%{}[]&*^!@""'`\/#";

ALTER TABLE testschema."table_2_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "col__1_$%{}[]&*^!@""'`\/#" text COLLATE pg_catalog."C" DEFAULT 'changed default value'::text;

COMMENT ON COLUMN testschema."table_2_$%{}[]()&*^!@""'`\/#"."col__1_$%{}[]&*^!@""'`\/#"
    IS 'test comment modify';

GRANT SELECT("col__1_$%{}[]&*^!@""'`\/#") ON testschema."table_2_$%{}[]()&*^!@""'`\/#" TO PUBLIC;
