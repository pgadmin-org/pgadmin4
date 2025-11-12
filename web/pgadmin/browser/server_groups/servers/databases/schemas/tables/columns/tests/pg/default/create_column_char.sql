-- Column: testschema."table_2_$%{}[]()&*^!@""'`\/#"."col_2_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE IF EXISTS testschema."table_2_$%{}[]()&*^!@""'`\/#" DROP COLUMN IF EXISTS "col_2_$%{}[]()&*^!@""'`\/#";

ALTER TABLE IF EXISTS testschema."table_2_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN IF NOT EXISTS "col_2_$%{}[]()&*^!@""'`\/#" character varying(50) COLLATE pg_catalog."C";

COMMENT ON COLUMN testschema."table_2_$%{}[]()&*^!@""'`\/#"."col_2_$%{}[]()&*^!@""'`\/#"
    IS 'Comment for create';
