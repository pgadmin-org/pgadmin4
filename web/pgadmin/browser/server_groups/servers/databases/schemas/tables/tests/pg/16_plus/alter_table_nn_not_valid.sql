-- Table: public.table_nn_not_valid

-- DROP TABLE IF EXISTS public.table_nn_not_valid;

CREATE TABLE IF NOT EXISTS public.table_nn_not_valid
(
    col_a integer,
    col_b text COLLATE pg_catalog."default"
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.table_nn_not_valid
    ADD CONSTRAINT nn_col_a NOT NULL col_a NOT VALID;

ALTER TABLE IF EXISTS public.table_nn_not_valid
    ADD CONSTRAINT nn_col_b NOT NULL col_b NO INHERIT NOT VALID;

ALTER TABLE IF EXISTS public.table_nn_not_valid
    OWNER to <OWNER>;

COMMENT ON TABLE public.table_nn_not_valid
    IS 'NOT VALID NOT NULL constraints';
