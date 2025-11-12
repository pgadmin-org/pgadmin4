-- Table: public.table_with_range_patition_$%{}[]()&*^!@"'`\/#

-- DROP TABLE IF EXISTS public."table_with_range_patition_$%{}[]()&*^!@""'`\/#";

CREATE TABLE IF NOT EXISTS public."table_with_range_patition_$%{}[]()&*^!@""'`\/#"
(
    id integer,
    status text COLLATE pg_catalog."default",
    arr numeric
) PARTITION BY RANGE (arr);

ALTER TABLE IF EXISTS public."table_with_range_patition_$%{}[]()&*^!@""'`\/#"
    OWNER to postgres;

-- Partitions SQL

CREATE TABLE public."cust_arr_small PARTITION" PARTITION OF public."table_with_range_patition_$%{}[]()&*^!@""'`\/#"
    FOR VALUES FROM ('20') TO ('25')
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."cust_arr_small PARTITION"
    OWNER to postgres;
