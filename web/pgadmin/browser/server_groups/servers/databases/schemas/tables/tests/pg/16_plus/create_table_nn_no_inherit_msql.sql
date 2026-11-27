CREATE TABLE public.table_nn_no_inherit
(
    col_a integer NOT NULL NO INHERIT,
    col_b serial NOT NULL,
    col_c integer NOT NULL
);

ALTER TABLE IF EXISTS public.table_nn_no_inherit
    OWNER to <OWNER>;
