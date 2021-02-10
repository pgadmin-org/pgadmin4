-- Column: testschema."table_2_$%{}[]()&*^!@""'`\/#"."new_col_5_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE testschema."table_2_$%{}[]()&*^!@""'`\/#" DROP COLUMN "new_col_5_$%{}[]()&*^!@""'`\/#";

ALTER TABLE testschema."table_2_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "new_col_5_$%{}[]()&*^!@""'`\/#" bigint NOT NULL;

COMMENT ON COLUMN testschema."table_2_$%{}[]()&*^!@""'`\/#"."new_col_5_$%{}[]()&*^!@""'`\/#"
    IS 'Comment for alter';
