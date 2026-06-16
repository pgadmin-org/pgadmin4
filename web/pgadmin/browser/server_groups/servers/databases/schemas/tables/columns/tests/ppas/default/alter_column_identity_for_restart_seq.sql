-- Column: testschema."table_3_$%{}[]()&*^!@""'`\/#"."col_6_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#" DROP COLUMN IF EXISTS "col_6_$%{}[]()&*^!@""'`\/#";

ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "col_6_$%{}[]()&*^!@""'`\/#" bigint NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 2 MINVALUE 1 MAXVALUE 10 CACHE 1 );

COMMENT ON COLUMN testschema."table_3_$%{}[]()&*^!@""'`\/#"."col_6_$%{}[]()&*^!@""'`\/#"
    IS 'demo comments';
