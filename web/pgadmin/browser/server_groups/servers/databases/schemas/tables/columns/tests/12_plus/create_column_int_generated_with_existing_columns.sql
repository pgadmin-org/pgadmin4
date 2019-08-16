-- Column: testschema."table_3_$%{}[]()&*^!@""'`\/#"."col_8_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE testschema."table_3_$%{}[]()&*^!@""'`\/#" DROP COLUMN "col_8_$%{}[]()&*^!@""'`\/#";

ALTER TABLE testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "col_8_$%{}[]()&*^!@""'`\/#" bigint GENERATED ALWAYS AS ((dummy1 + dummy2)) STORED;

COMMENT ON COLUMN testschema."table_3_$%{}[]()&*^!@""'`\/#"."col_8_$%{}[]()&*^!@""'`\/#"
    IS 'Comment for create';
