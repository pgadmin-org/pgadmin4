CREATE TABLE public."table_with_patition_$%{}[]()&*^!@""'`\/#"
(
    id integer,
    status text,
    arr numeric
) PARTITION BY LIST (status);

ALTER TABLE IF EXISTS public."table_with_patition_$%{}[]()&*^!@""'`\/#"
    OWNER to postgres;

COMMENT ON TABLE public."table_with_patition_$%{}[]()&*^!@""'`\/#"
    IS 'partition table';

CREATE TABLE public.cust_active PARTITION OF public."table_with_patition_$%{}[]()&*^!@""'`\/#"
    FOR VALUES IN ('ACTIVE');
