-- Column: testschema."table_3_$%{}[]()&*^!@""'`\/#"."new_col_8_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE testschema."table_3_$%{}[]()&*^!@""'`\/#" DROP COLUMN "new_col_8_$%{}[]()&*^!@""'`\/#";

ALTER TABLE testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "new_col_8_$%{}[]()&*^!@""'`\/#" bigint GENERATED ALWAYS AS ((dummy1 + dummy2)) STORED;

COMMENT ON COLUMN testschema."table_3_$%{}[]()&*^!@""'`\/#"."new_col_8_$%{}[]()&*^!@""'`\/#"
    IS 'Comment for alter';

GRANT INSERT("new_col_8_$%{}[]()&*^!@""'`\/#"), SELECT("new_col_8_$%{}[]()&*^!@""'`\/#"), REFERENCES("new_col_8_$%{}[]()&*^!@""'`\/#") ON testschema."table_3_$%{}[]()&*^!@""'`\/#" TO PUBLIC;
