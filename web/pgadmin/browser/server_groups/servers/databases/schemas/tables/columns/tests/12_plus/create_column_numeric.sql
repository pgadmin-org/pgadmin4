-- Column: testschema."table_3_$%{}[]()&*^!@""'`\/#"."col_5_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE testschema."table_3_$%{}[]()&*^!@""'`\/#" DROP COLUMN "col_5_$%{}[]()&*^!@""'`\/#";

ALTER TABLE testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "col_5_$%{}[]()&*^!@""'`\/#" numeric(10,5) NOT NULL;

COMMENT ON COLUMN testschema."table_3_$%{}[]()&*^!@""'`\/#"."col_5_$%{}[]()&*^!@""'`\/#"
    IS 'Comment for create';

ALTER TABLE testschema."table_3_$%{}[]()&*^!@""'`\/#"
    ALTER COLUMN "col_5_$%{}[]()&*^!@""'`\/#"
    SET (n_distinct=1);
