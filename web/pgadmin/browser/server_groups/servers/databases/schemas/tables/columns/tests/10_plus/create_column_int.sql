-- Column: testschema."table_2_$%{}[]()&*^!@""'`\/#"."col_1_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE testschema."table_2_$%{}[]()&*^!@""'`\/#" DROP COLUMN "col_1_$%{}[]()&*^!@""'`\/#";

ALTER TABLE testschema."table_2_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "col_1_$%{}[]()&*^!@""'`\/#" bigint NOT NULL DEFAULT 1;

COMMENT ON COLUMN testschema."table_2_$%{}[]()&*^!@""'`\/#"."col_1_$%{}[]()&*^!@""'`\/#"
    IS 'Comment for create';
