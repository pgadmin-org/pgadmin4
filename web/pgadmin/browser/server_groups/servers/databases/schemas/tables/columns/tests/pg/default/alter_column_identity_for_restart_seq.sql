-- Column: testschema."table_2_$%{}[]()&*^!@""'`\/#"."col_6_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE IF EXISTS testschema."table_2_$%{}[]()&*^!@""'`\/#" DROP COLUMN IF EXISTS "col_6_$%{}[]()&*^!@""'`\/#";

ALTER TABLE IF EXISTS testschema."table_2_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN IF NOT EXISTS "col_6_$%{}[]()&*^!@""'`\/#" bigint NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 2 MINVALUE 1 MAXVALUE 10 CACHE 1 );

COMMENT ON COLUMN testschema."table_2_$%{}[]()&*^!@""'`\/#"."col_6_$%{}[]()&*^!@""'`\/#"
    IS 'demo comments';
