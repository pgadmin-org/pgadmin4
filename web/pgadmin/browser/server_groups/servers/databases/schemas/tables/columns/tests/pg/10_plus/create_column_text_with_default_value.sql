-- Column: testschema."table_2_$%{}[]()&*^!@""'`\/#"."col__1_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE testschema."table_2_$%{}[]()&*^!@""'`\/#" DROP COLUMN "col__1_$%{}[]()&*^!@""'`\/#";

ALTER TABLE testschema."table_2_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "col__1_$%{}[]()&*^!@""'`\/#" text COLLATE pg_catalog."default" DEFAULT 'xyz'::text;

COMMENT ON COLUMN testschema."table_2_$%{}[]()&*^!@""'`\/#"."col__1_$%{}[]()&*^!@""'`\/#"
    IS 'test comment';
