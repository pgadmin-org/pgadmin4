-- Column: testschema."table_2_$%{}[]()&*^!@""'`\/#"."col_6_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE testschema."table_2_$%{}[]()&*^!@""'`\/#" DROP COLUMN "col_6_$%{}[]()&*^!@""'`\/#";

ALTER TABLE testschema."table_2_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "col_6_$%{}[]()&*^!@""'`\/#" bigint NOT NULL GENERATED ALWAYS AS IDENTITY ( CYCLE INCREMENT 3 START 3 MINVALUE 3 MAXVALUE 30 CACHE 3 );

COMMENT ON COLUMN testschema."table_2_$%{}[]()&*^!@""'`\/#"."col_6_$%{}[]()&*^!@""'`\/#"
    IS 'demo comments';
