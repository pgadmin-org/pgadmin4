-- Table: public.simple_table_comp_$%{}[]()&*^!@"'`\/#

-- DROP TABLE IF EXISTS public."simple_table_comp_$%{}[]()&*^!@""'`\/#";

CREATE TABLE IF NOT EXISTS public."simple_table_comp_$%{}[]()&*^!@""'`\/#"
(
    col4 character varying(30) COMPRESSION pglz COLLATE pg_catalog."default",
    col5 bit(1) COMPRESSION lz4,
    col6 bigint
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."simple_table_comp_$%{}[]()&*^!@""'`\/#"
    OWNER to enterprisedb;

COMMENT ON TABLE public."simple_table_comp_$%{}[]()&*^!@""'`\/#"
    IS 'test comment';
