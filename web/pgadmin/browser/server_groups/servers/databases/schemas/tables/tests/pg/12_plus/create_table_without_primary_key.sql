-- Table: public.simple_table_$%{}[]()&*^!@"'`\/#

-- DROP TABLE IF EXISTS public."simple_table_$%{}[]()&*^!@""'`\/#";

CREATE TABLE IF NOT EXISTS public."simple_table_$%{}[]()&*^!@""'`\/#"
(
    col1 integer,
    col2 text COLLATE pg_catalog."default",
    col3 boolean,
    col4 character varying(30) COLLATE pg_catalog."default",
    col5 numeric(20,10),
    col6 timestamp(5) with time zone
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."simple_table_$%{}[]()&*^!@""'`\/#"
    OWNER to postgres;

COMMENT ON TABLE public."simple_table_$%{}[]()&*^!@""'`\/#"
    IS 'test comment';
