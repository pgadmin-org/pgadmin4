-- Column: testschema."table_3_$%{}[]()&*^!@""'`\/#".col_id_ni

-- ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#" DROP COLUMN IF EXISTS col_id_ni;

ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN col_id_ni integer CONSTRAINT "table_3_$%{}[]()&*^!@""'`\/#_col_id_ni_not_null" NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 );

ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ALTER CONSTRAINT "table_3_$%{}[]()&*^!@""'`\/#_col_id_ni_not_null" NO INHERIT;

COMMENT ON COLUMN testschema."table_3_$%{}[]()&*^!@""'`\/#".col_id_ni
    IS 'Comment for alter';
