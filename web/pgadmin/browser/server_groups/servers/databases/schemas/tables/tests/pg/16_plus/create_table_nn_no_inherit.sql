-- Table: public.table_nn_no_inherit

-- DROP TABLE IF EXISTS public.table_nn_no_inherit;

CREATE TABLE IF NOT EXISTS public.table_nn_no_inherit
(
    col_a integer NOT NULL NO INHERIT,
    col_b serial NOT NULL,
    col_c integer NOT NULL
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.table_nn_no_inherit
    OWNER to <OWNER>;
