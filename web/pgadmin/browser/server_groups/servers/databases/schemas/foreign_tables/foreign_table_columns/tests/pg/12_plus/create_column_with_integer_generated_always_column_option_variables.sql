-- Column: public."foreign_table_2_$%{}[]()&*^!@""'`\/#"."col_4_$%{}[]()&*^!@""'`\/#"

-- ALTER FOREIGN TABLE IF EXISTS public."foreign_table_2_$%{}[]()&*^!@""'`\/#" DROP COLUMN IF EXISTS "col_4_$%{}[]()&*^!@""'`\/#";

ALTER FOREIGN TABLE IF EXISTS public."foreign_table_2_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "col_4_$%{}[]()&*^!@""'`\/#" bigint OPTIONS (column_name 'test_options') NOT NULL GENERATED ALWAYS AS ((1000 + 1)) STORED;

COMMENT ON COLUMN public."foreign_table_2_$%{}[]()&*^!@""'`\/#"."col_4_$%{}[]()&*^!@""'`\/#"
    IS 'test comment';

ALTER FOREIGN TABLE IF EXISTS public."foreign_table_2_$%{}[]()&*^!@""'`\/#"
    ALTER COLUMN "col_4_$%{}[]()&*^!@""'`\/#"
    SET (n_distinct=1);
