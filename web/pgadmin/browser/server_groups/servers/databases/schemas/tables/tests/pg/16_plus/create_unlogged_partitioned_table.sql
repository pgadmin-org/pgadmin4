-- Table: public.unlogged_partitioned_tbl

-- DROP TABLE IF EXISTS public.unlogged_partitioned_tbl;

CREATE TABLE IF NOT EXISTS public.unlogged_partitioned_tbl
(
    id integer,
    status text COLLATE pg_catalog."default"
) PARTITION BY LIST (status);

ALTER TABLE IF EXISTS public.unlogged_partitioned_tbl
    OWNER to <OWNER>;

COMMENT ON TABLE public.unlogged_partitioned_tbl
    IS 'unlogged partitioned table';

-- Partitions SQL

CREATE TABLE public.unlogged_partitioned_tbl_p1 PARTITION OF public.unlogged_partitioned_tbl
    FOR VALUES IN ('ACTIVE')
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.unlogged_partitioned_tbl_p1
    OWNER to <OWNER>;
