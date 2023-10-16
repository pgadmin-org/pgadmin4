-- FOREIGN TABLE: public.FT1_$%{}[]()&*^!@"'`\/#

-- DROP FOREIGN TABLE IF EXISTS public."FT1_$%{}[]()&*^!@""'`\/#";

CREATE FOREIGN TABLE IF NOT EXISTS public."FT1_$%{}[]()&*^!@""'`\/#"(
    col1 integer
)
    SERVER test_fs_for_foreign_table
    OPTIONS (table_name 'test_table');

ALTER FOREIGN TABLE public."FT1_$%{}[]()&*^!@""'`\/#"
    OWNER TO postgres;

COMMENT ON FOREIGN TABLE public."FT1_$%{}[]()&*^!@""'`\/#"
    IS 'Test Comment';

GRANT ALL ON TABLE public."FT1_$%{}[]()&*^!@""'`\/#" TO postgres;


ALTER TABLE IF EXISTS "FT1_$%{}[]()&*^!@""'`\/#"
    ALTER COLUMN col1 SET STATISTICS 10;
