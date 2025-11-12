-- Table: public.simple_table_with_pk$%{}[]()&*^!@"'`\/#

-- DROP TABLE IF EXISTS public."simple_table_with_pk$%{}[]()&*^!@""'`\/#";

CREATE TABLE IF NOT EXISTS public."simple_table_with_pk$%{}[]()&*^!@""'`\/#"
(
    "col1_$%{}[]()&*^!@\""'`\\/#" integer NOT NULL,
    "col2_$%{}[]()&*^!@\""'`\\/#" json NOT NULL,
    CONSTRAINT "simple_table_with_pk$%{}[]()&*^!@""'`\/#_pkey" PRIMARY KEY ("col1_$%{}[]()&*^!@\""""'`\\/#")
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."simple_table_with_pk$%{}[]()&*^!@""'`\/#"
    OWNER to enterprisedb;

COMMENT ON TABLE public."simple_table_with_pk$%{}[]()&*^!@""'`\/#"
    IS 'test comment';
