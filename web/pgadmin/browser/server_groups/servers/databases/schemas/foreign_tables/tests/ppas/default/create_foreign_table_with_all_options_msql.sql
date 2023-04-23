CREATE FOREIGN TABLE public."FT1_$%{}[]()&*^!@""'`\/#"(
    col1 bigint NULL,
    col2 text NULL
)
    SERVER test_fs_for_foreign_table
    OPTIONS (schema_name 'public', table_name 'test_table');

ALTER FOREIGN TABLE public."FT1_$%{}[]()&*^!@""'`\/#"
    OWNER TO enterprisedb;

ALTER FOREIGN TABLE public."FT1_$%{}[]()&*^!@""'`\/#"
    ADD CONSTRAINT cons1 CHECK (true) NO INHERIT;

COMMENT ON FOREIGN TABLE public."FT1_$%{}[]()&*^!@""'`\/#"
    IS 'Test Comment';

GRANT ALL ON TABLE public."FT1_$%{}[]()&*^!@""'`\/#" TO PUBLIC;
