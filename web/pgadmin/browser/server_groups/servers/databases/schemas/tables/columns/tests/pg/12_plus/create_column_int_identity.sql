-- Column: testschema."table_3_$%{}[]()&*^!@""'`\/#"."col_3_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE testschema."table_3_$%{}[]()&*^!@""'`\/#" DROP COLUMN "col_3_$%{}[]()&*^!@""'`\/#";

ALTER TABLE testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "col_3_$%{}[]()&*^!@""'`\/#" bigint NOT NULL GENERATED ALWAYS AS IDENTITY ( CYCLE INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 99999 CACHE 10 );

COMMENT ON COLUMN testschema."table_3_$%{}[]()&*^!@""'`\/#"."col_3_$%{}[]()&*^!@""'`\/#"
    IS 'Comment for create';
