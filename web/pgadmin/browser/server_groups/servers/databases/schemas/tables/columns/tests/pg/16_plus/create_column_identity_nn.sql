-- Column: testschema."table_3_$%{}[]()&*^!@""'`\/#".col_id_ni

-- ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#" DROP COLUMN IF EXISTS col_id_ni;

ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN col_id_ni integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 );
