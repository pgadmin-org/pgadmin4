CREATE TABLE public.table_nn_not_valid
(
    col_a integer,
    col_b text
);

ALTER TABLE IF EXISTS public.table_nn_not_valid
    OWNER to <OWNER>;
