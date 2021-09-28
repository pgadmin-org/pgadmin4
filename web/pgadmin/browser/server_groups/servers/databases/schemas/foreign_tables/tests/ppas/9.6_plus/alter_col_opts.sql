-- FOREIGN TABLE: public.FT1_$%{}[]()&*^!@"'`\/#

-- DROP FOREIGN TABLE IF EXISTS public."FT1_$%{}[]()&*^!@""'`\/#";

CREATE FOREIGN TABLE IF NOT EXISTS public."FT1_$%{}[]()&*^!@""'`\/#"(
    col1 integer NULL
)
    SERVER test_fs_for_foreign_table
    OPTIONS (schema_name 'test_public', table_name 'test_table');

ALTER FOREIGN TABLE public."FT1_$%{}[]()&*^!@""'`\/#"
    OWNER TO enterprisedb;

ALTER FOREIGN TABLE public."FT1_$%{}[]()&*^!@""'`\/#"
    ADD CONSTRAINT cons1 CHECK (true) NO INHERIT;

COMMENT ON FOREIGN TABLE public."FT1_$%{}[]()&*^!@""'`\/#"
    IS 'Test Comment';

GRANT SELECT ON TABLE public."FT1_$%{}[]()&*^!@""'`\/#" TO PUBLIC;

GRANT ALL ON TABLE public."FT1_$%{}[]()&*^!@""'`\/#" TO enterprisedb;
