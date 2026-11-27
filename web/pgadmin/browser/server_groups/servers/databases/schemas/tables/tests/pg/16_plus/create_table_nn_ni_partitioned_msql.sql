CREATE TABLE public.table_nn_ni_partitioned
(
    col_a integer NOT NULL
) PARTITION BY RANGE (col_a);

ALTER TABLE IF EXISTS public.table_nn_ni_partitioned
    OWNER to <OWNER>;
