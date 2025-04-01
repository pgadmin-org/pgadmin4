-- Table: public.simple_table_$%{}[]()&*^!@"'`\/#

-- DROP TABLE IF EXISTS public."simple_table_$%{}[]()&*^!@""'`\/#";

CREATE TABLE IF NOT EXISTS public."simple_table_$%{}[]()&*^!@""'`\/#"
(
    col1 bigint NOT NULL,
    col2 character varying COLLATE pg_catalog."default",
    col3 boolean,
    col4 character varying(30) COLLATE pg_catalog."default",
    col5 numeric(20,10),
    col6 time(5) without time zone,
    CONSTRAINT "simple_table_$%{}[]()&*^!@""'`\/#_pkey" PRIMARY KEY (col1)
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."simple_table_$%{}[]()&*^!@""'`\/#"
    OWNER to enterprisedb;

COMMENT ON TABLE public."simple_table_$%{}[]()&*^!@""'`\/#"
    IS 'test comment';
