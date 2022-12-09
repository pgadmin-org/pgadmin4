-- Table: public.table_with_hash_patition_$%{}[]()&*^!@\"'`\\/#

-- DROP TABLE IF EXISTS public."table_with_hash_patition_$%{}[]()&*^!@\""'`\\/#";

CREATE TABLE IF NOT EXISTS public."table_with_hash_patition_$%{}[]()&*^!@\""'`\\/#"
(
    id bigint,
    name text COLLATE pg_catalog."default",
    arr numeric
) PARTITION BY HASH (id)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."table_with_hash_patition_$%{}[]()&*^!@\""'`\\/#"
    OWNER to enterprisedb;

COMMENT ON TABLE public."table_with_hash_patition_$%{}[]()&*^!@\""'`\\/#"
    IS 'hash partition';

-- Partitions SQL

CREATE TABLE IF NOT EXISTS public.cust_part11 PARTITION OF public."table_with_hash_patition_$%{}[]()&*^!@\""'`\\/#"
    FOR VALUES WITH (modulus 2, remainder 1)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.cust_part11
    OWNER to enterprisedb;
