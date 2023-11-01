-- Column: public."foreign_table_2_$%{}[]()&*^!@""'`\/#"."col_2_$%{}[]()&*^!@""'`\/#"

-- ALTER FOREIGN TABLE IF EXISTS public."foreign_table_2_$%{}[]()&*^!@""'`\/#" DROP COLUMN IF EXISTS "col_2_$%{}[]()&*^!@""'`\/#";

ALTER FOREIGN TABLE IF EXISTS public."foreign_table_2_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN "col_2_$%{}[]()&*^!@""'`\/#" text COLLATE pg_catalog."default" NOT NULL DEFAULT 'changed default value'::text;

COMMENT ON COLUMN public."foreign_table_2_$%{}[]()&*^!@""'`\/#"."col_2_$%{}[]()&*^!@""'`\/#"
    IS 'test comment';
