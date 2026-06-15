CREATE TABLE public."table_with_hash_patition_$%{}[]()&*^!@\""'`\\/#"
(
    id bigint,
    name text,
    arr numeric
) PARTITION BY HASH (id);

ALTER TABLE IF EXISTS public."table_with_hash_patition_$%{}[]()&*^!@\""'`\\/#"
    OWNER to enterprisedb;

COMMENT ON TABLE public."table_with_hash_patition_$%{}[]()&*^!@\""'`\\/#"
    IS 'hash partition';

CREATE TABLE IF NOT EXISTS public.cust_part11 PARTITION OF public."table_with_hash_patition_$%{}[]()&*^!@\""'`\\/#"
    FOR VALUES WITH (MODULUS 2, REMAINDER 1);
