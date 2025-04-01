-- Column: testschema."table_3_$%{}[]()&*^!@""'`\/#"."col_6_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#" DROP COLUMN IF EXISTS "col_6_$%{}[]()&*^!@""'`\/#";

ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "col_6_$%{}[]()&*^!@""'`\/#" bigint NOT NULL GENERATED ALWAYS AS IDENTITY ( CYCLE INCREMENT 3 START 3 MINVALUE 3 MAXVALUE 30 CACHE 3 );

COMMENT ON COLUMN testschema."table_3_$%{}[]()&*^!@""'`\/#"."col_6_$%{}[]()&*^!@""'`\/#"
    IS 'demo comments';
