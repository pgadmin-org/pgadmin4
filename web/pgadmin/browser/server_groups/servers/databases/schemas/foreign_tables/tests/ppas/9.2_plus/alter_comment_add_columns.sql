-- FOREIGN TABLE: public.FT1_$%{}[]()&*^!@"'`\/#

-- DROP FOREIGN TABLE public."FT1_$%{}[]()&*^!@""'`\/#";

CREATE FOREIGN TABLE public."FT1_$%{}[]()&*^!@""'`\/#"(
    col1 bigint NULL,
    col2 text NULL COLLATE pg_catalog."default",
    col3 bigint NULL,
    col4 text NULL COLLATE pg_catalog."default"
)
    SERVER test_fs_for_foreign_table;

ALTER FOREIGN TABLE public."FT1_$%{}[]()&*^!@""'`\/#"
    OWNER TO enterprisedb;

COMMENT ON FOREIGN TABLE public."FT1_$%{}[]()&*^!@""'`\/#"
    IS 'Test Comment';
