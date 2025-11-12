-- Table: public.table_with_patition_$%{}[]()&*^!@"'`\/#

-- DROP TABLE IF EXISTS public."table_with_patition_$%{}[]()&*^!@""'`\/#";

CREATE TABLE IF NOT EXISTS public."table_with_patition_$%{}[]()&*^!@""'`\/#"
(
    id integer,
    status text COLLATE pg_catalog."default",
    arr numeric
) PARTITION BY LIST (status);

ALTER TABLE IF EXISTS public."table_with_patition_$%{}[]()&*^!@""'`\/#"
    OWNER to postgres;

COMMENT ON TABLE public."table_with_patition_$%{}[]()&*^!@""'`\/#"
    IS 'partition table';

-- Partitions SQL

CREATE TABLE public.cust_active PARTITION OF public."table_with_patition_$%{}[]()&*^!@""'`\/#"
    FOR VALUES IN ('ACTIVE')
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.cust_active
    OWNER to postgres;
