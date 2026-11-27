-- Table: public.table_nn_no_inherit

-- DROP TABLE IF EXISTS public.table_nn_no_inherit;

CREATE TABLE IF NOT EXISTS public.table_nn_no_inherit
(
    col_a integer NOT NULL NO INHERIT,
    col_b serial CONSTRAINT table_nn_no_inherit_col_b_not_null NOT NULL,
    col_c integer CONSTRAINT table_nn_no_inherit_col_c_not_null NOT NULL,
    CONSTRAINT table_nn_no_inherit_pkey PRIMARY KEY (col_c)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.table_nn_no_inherit
    ALTER CONSTRAINT table_nn_no_inherit_col_b_not_null NO INHERIT;

ALTER TABLE IF EXISTS public.table_nn_no_inherit
    ALTER CONSTRAINT table_nn_no_inherit_col_c_not_null NO INHERIT;

ALTER TABLE IF EXISTS public.table_nn_no_inherit
    OWNER to <OWNER>;

COMMENT ON TABLE public.table_nn_no_inherit
    IS 'NO INHERIT NOT NULL constraints';
