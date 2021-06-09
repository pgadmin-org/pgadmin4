-- Column: testschema."table_2_$%{}[]()&*^!@""'`\/#"."col__2_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE testschema."table_2_$%{}[]()&*^!@""'`\/#" DROP COLUMN "col__2_$%{}[]()&*^!@""'`\/#";

ALTER TABLE testschema."table_2_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "col__2_$%{}[]()&*^!@""'`\/#" time(4) with time zone DEFAULT now();

COMMENT ON COLUMN testschema."table_2_$%{}[]()&*^!@""'`\/#"."col__2_$%{}[]()&*^!@""'`\/#"
    IS 'test comment';
