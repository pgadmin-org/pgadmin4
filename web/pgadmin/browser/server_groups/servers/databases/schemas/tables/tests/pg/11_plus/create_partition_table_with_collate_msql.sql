CREATE TABLE public."partition_table_with_collate_$%{}[]()&*^!@""'`\/#"
(
    id integer,
    status text,
    arr numeric
) PARTITION BY RANGE (status COLLATE "C" text_pattern_ops)
WITH (
    OIDS = FALSE
);

ALTER TABLE IF EXISTS public."partition_table_with_collate_$%{}[]()&*^!@""'`\/#"
    OWNER to postgres;

COMMENT ON TABLE public."partition_table_with_collate_$%{}[]()&*^!@""'`\/#"
    IS 'partition table';

CREATE TABLE public.cust_arr_small PARTITION OF public."partition_table_with_collate_$%{}[]()&*^!@""'`\/#"
    FOR VALUES FROM ('20') TO ('25');

