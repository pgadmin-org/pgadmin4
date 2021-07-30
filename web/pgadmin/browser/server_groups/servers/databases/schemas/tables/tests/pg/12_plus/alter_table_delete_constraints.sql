-- Table: public.table_with_pk_chk_constraints$%{}[]()&*^!@"'`\/#

-- DROP TABLE IF EXISTS public."table_with_pk_chk_constraints$%{}[]()&*^!@""'`\/#";

CREATE TABLE IF NOT EXISTS public."table_with_pk_chk_constraints$%{}[]()&*^!@""'`\/#"
(
    "col1_$%{}[]()&*^!@\""'`\\/#" time(5) with time zone NOT NULL,
    col2 character(12) COLLATE pg_catalog."default",
    CONSTRAINT custom_pk PRIMARY KEY ("col1_$%{}[]()&*^!@\""""'`\\/#")
        WITH (FILLFACTOR=11)
        DEFERRABLE INITIALLY DEFERRED
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."table_with_pk_chk_constraints$%{}[]()&*^!@""'`\/#"
    OWNER to postgres;

COMMENT ON TABLE public."table_with_pk_chk_constraints$%{}[]()&*^!@""'`\/#"
    IS 'create table comment';
COMMENT ON CONSTRAINT custom_pk ON public."table_with_pk_chk_constraints$%{}[]()&*^!@""'`\/#"
    IS 'custom pk created';
