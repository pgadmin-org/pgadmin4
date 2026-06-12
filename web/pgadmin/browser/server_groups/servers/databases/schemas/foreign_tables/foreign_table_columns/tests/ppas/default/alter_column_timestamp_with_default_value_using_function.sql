-- Column: public."foreign_table_2_$%{}[]()&*^!@""'`\/#"."col_3_$%{}[]()&*^!@""'`\/#"

-- ALTER FOREIGN TABLE IF EXISTS public."foreign_table_2_$%{}[]()&*^!@""'`\/#" DROP COLUMN IF EXISTS "col_3_$%{}[]()&*^!@""'`\/#";

ALTER FOREIGN TABLE IF EXISTS public."foreign_table_2_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "col_3_$%{}[]()&*^!@""'`\/#" time(6) with time zone DEFAULT now();

COMMENT ON COLUMN public."foreign_table_2_$%{}[]()&*^!@""'`\/#"."col_3_$%{}[]()&*^!@""'`\/#"
    IS 'test comment modification';
