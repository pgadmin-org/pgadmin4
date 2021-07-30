-- Column: testschema."table_1_$%{}[]()&*^!@""'`\/#"."col_3_$%{}[]()&*^!@""'`\/#"

-- ALTER TABLE IF EXISTS testschema."table_1_$%{}[]()&*^!@""'`\/#" DROP COLUMN IF EXISTS "col_3_$%{}[]()&*^!@""'`\/#";

ALTER TABLE IF EXISTS testschema."table_1_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN IF NOT EXISTS "col_3_$%{}[]()&*^!@""'`\/#" numeric(10,5) NOT NULL;

COMMENT ON COLUMN testschema."table_1_$%{}[]()&*^!@""'`\/#"."col_3_$%{}[]()&*^!@""'`\/#"
    IS 'Comment for create';

ALTER TABLE IF EXISTS testschema."table_1_$%{}[]()&*^!@""'`\/#"
    ALTER COLUMN "col_3_$%{}[]()&*^!@""'`\/#"
    SET (n_distinct=1);
