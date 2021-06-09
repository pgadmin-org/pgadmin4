CREATE TABLE IF NOT EXISTS public."table_with_patition_$%{}[]()&*^!@""'`\/#"
(
    id integer,
    status text,
    arr numeric
) PARTITION BY LIST (status)
WITH (
    OIDS = FALSE
);

ALTER TABLE public."table_with_patition_$%{}[]()&*^!@""'`\/#"
    OWNER to postgres;

COMMENT ON TABLE public."table_with_patition_$%{}[]()&*^!@""'`\/#"
    IS 'partition table';

CREATE TABLE IF NOT EXISTS public.cust_active PARTITION OF public."table_with_patition_$%{}[]()&*^!@""'`\/#"
    FOR VALUES IN ('ACTIVE');
