CREATE TABLE public.unlogged_partitioned_tbl
(
    id integer,
    status text
) PARTITION BY LIST (status);

ALTER TABLE IF EXISTS public.unlogged_partitioned_tbl
    OWNER to <OWNER>;

COMMENT ON TABLE public.unlogged_partitioned_tbl
    IS 'unlogged partitioned table';

CREATE TABLE public.unlogged_partitioned_tbl_p1 PARTITION OF public.unlogged_partitioned_tbl
    FOR VALUES IN ('ACTIVE');
