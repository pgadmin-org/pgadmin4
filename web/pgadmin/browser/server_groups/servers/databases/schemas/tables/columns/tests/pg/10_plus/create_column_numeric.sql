-- Column: testschema."table_2_$%{}[]()&*^!@""'`\/#"."col_4_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE testschema."table_2_$%{}[]()&*^!@""'`\/#" DROP COLUMN "col_4_$%{}[]()&*^!@""'`\/#";

ALTER TABLE testschema."table_2_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "col_4_$%{}[]()&*^!@""'`\/#" numeric(10,5) NOT NULL;

COMMENT ON COLUMN testschema."table_2_$%{}[]()&*^!@""'`\/#"."col_4_$%{}[]()&*^!@""'`\/#"
    IS 'Comment for create';

ALTER TABLE testschema."table_2_$%{}[]()&*^!@""'`\/#"
    ALTER COLUMN "col_4_$%{}[]()&*^!@""'`\/#"
    SET (n_distinct=1);
