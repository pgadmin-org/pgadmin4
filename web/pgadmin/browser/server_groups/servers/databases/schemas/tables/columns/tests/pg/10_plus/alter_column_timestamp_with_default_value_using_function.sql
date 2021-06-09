-- Column: testschema."table_2_$%{}[]()&*^!@""'`\/#"."col__2_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE testschema."table_2_$%{}[]()&*^!@""'`\/#" DROP COLUMN "col__2_$%{}[]()&*^!@""'`\/#";

ALTER TABLE testschema."table_2_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "col__2_$%{}[]()&*^!@""'`\/#" time(6) with time zone NOT NULL DEFAULT now();

COMMENT ON COLUMN testschema."table_2_$%{}[]()&*^!@""'`\/#"."col__2_$%{}[]()&*^!@""'`\/#"
    IS 'test comment modification';
