-- Column: public."foreign_table_2_$%{}[]()&*^!@""'`\/#"."new_col_1_$%{}[]()&*^!@""'`\/#"

-- ALTER FOREIGN TABLE IF EXISTS public."foreign_table_2_$%{}[]()&*^!@""'`\/#" DROP COLUMN IF EXISTS "new_col_1_$%{}[]()&*^!@""'`\/#";

ALTER FOREIGN TABLE IF EXISTS public."foreign_table_2_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "new_col_1_$%{}[]()&*^!@""'`\/#" real OPTIONS (column_name 'test') NOT NULL DEFAULT 1;

COMMENT ON COLUMN public."foreign_table_2_$%{}[]()&*^!@""'`\/#"."new_col_1_$%{}[]()&*^!@""'`\/#"
    IS 'Comment for alter';
