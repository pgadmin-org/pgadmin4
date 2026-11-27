-- Column: testschema."table_3_$%{}[]()&*^!@""'`\/#".col_nn_nv

-- ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#" DROP COLUMN IF EXISTS col_nn_nv;

ALTER TABLE IF EXISTS testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN col_nn_nv integer NOT NULL;

COMMENT ON COLUMN testschema."table_3_$%{}[]()&*^!@""'`\/#".col_nn_nv
    IS 'Comment for alter';
