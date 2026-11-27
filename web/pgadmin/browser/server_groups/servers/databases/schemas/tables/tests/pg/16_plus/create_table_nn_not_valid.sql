-- Table: public.table_nn_not_valid

-- DROP TABLE IF EXISTS public.table_nn_not_valid;

CREATE TABLE IF NOT EXISTS public.table_nn_not_valid
(
    col_a integer,
    col_b text COLLATE pg_catalog."default"
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.table_nn_not_valid
    OWNER to <OWNER>;
