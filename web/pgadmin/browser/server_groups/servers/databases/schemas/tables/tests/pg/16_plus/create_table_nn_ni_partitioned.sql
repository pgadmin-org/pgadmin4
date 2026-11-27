-- Table: public.table_nn_ni_partitioned

-- DROP TABLE IF EXISTS public.table_nn_ni_partitioned;

CREATE TABLE IF NOT EXISTS public.table_nn_ni_partitioned
(
    col_a integer NOT NULL
) PARTITION BY RANGE (col_a);

ALTER TABLE IF EXISTS public.table_nn_ni_partitioned
    OWNER to <OWNER>;
