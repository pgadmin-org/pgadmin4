-- Table: public.table_with_fk_constraints$%{}[]()&*^!@"'`\/#

-- DROP TABLE IF EXISTS public."table_with_fk_constraints$%{}[]()&*^!@""'`\/#";

CREATE TABLE IF NOT EXISTS public."table_with_fk_constraints$%{}[]()&*^!@""'`\/#"
(
    col1 integer,
    col2 bigint,
    col3 text COLLATE pg_catalog."default",
    CONSTRAINT fk2 FOREIGN KEY (col2)
        REFERENCES public.fk_reference_tbl (name) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID,
    CONSTRAINT fk_test FOREIGN KEY (col1)
        REFERENCES public.fk_reference_tbl (id) MATCH FULL
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        DEFERRABLE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."table_with_fk_constraints$%{}[]()&*^!@""'`\/#"
    OWNER to enterprisedb;

COMMENT ON TABLE public."table_with_fk_constraints$%{}[]()&*^!@""'`\/#"
    IS 'test comment';

COMMENT ON CONSTRAINT fk_test ON public."table_with_fk_constraints$%{}[]()&*^!@""'`\/#"
    IS 'fk comment';
