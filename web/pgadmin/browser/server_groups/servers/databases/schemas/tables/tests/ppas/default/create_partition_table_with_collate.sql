-- Table: public.partition_table_with_collate_$%{}[]()&*^!@"'`\/#

-- DROP TABLE IF EXISTS public."partition_table_with_collate_$%{}[]()&*^!@""'`\/#";

CREATE TABLE IF NOT EXISTS public."partition_table_with_collate_$%{}[]()&*^!@""'`\/#"
(
    id integer,
    status text COLLATE pg_catalog."default",
    arr numeric
) PARTITION BY RANGE (status COLLATE "C" text_pattern_ops)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."partition_table_with_collate_$%{}[]()&*^!@""'`\/#"
    OWNER to enterprisedb;

COMMENT ON TABLE public."partition_table_with_collate_$%{}[]()&*^!@""'`\/#"
    IS 'partition table';

-- Partitions SQL

CREATE TABLE IF NOT EXISTS public.cust_arr_small PARTITION OF public."partition_table_with_collate_$%{}[]()&*^!@""'`\/#"
    FOR VALUES FROM ('20') TO ('25')
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.cust_arr_small
    OWNER to enterprisedb;
