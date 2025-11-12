-- Table: public.simple_table_comp_$%{}[]()&*^!@"'`\/#

-- DROP TABLE IF EXISTS public."simple_table_comp_$%{}[]()&*^!@""'`\/#";

CREATE TABLE IF NOT EXISTS public."simple_table_comp_$%{}[]()&*^!@""'`\/#"
(
    col4 character varying(30) COMPRESSION lz4 COLLATE pg_catalog."default",
    col5 bit(1) COMPRESSION pglz,
    col6 bigint
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."simple_table_comp_$%{}[]()&*^!@""'`\/#"
    OWNER to postgres;

COMMENT ON TABLE public."simple_table_comp_$%{}[]()&*^!@""'`\/#"
    IS 'test comment';
