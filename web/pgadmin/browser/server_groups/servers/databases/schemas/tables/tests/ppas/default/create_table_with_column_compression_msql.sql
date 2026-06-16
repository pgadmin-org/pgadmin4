CREATE TABLE public."simple_table_comp_$%{}[]()&*^!@""'`\/#"
(
    col4 character varying(30) COMPRESSION pglz,
    col5 bit COMPRESSION lz4,
    col6 bigint
);

ALTER TABLE IF EXISTS public."simple_table_comp_$%{}[]()&*^!@""'`\/#"
    OWNER to enterprisedb;

COMMENT ON TABLE public."simple_table_comp_$%{}[]()&*^!@""'`\/#"
    IS 'test comment';
