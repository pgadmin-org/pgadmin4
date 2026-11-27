-- Column: testschema."table_3_$%{}[]()&*^!@""'`\/#".col_nv_ui

-- ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#" DROP COLUMN IF EXISTS col_nv_ui;

ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN col_nv_ui integer;

ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ADD CONSTRAINT "table_3_$%{}[]()&*^!@""'`\/#_col_nv_ui_not_null" NOT NULL col_nv_ui NOT VALID;
