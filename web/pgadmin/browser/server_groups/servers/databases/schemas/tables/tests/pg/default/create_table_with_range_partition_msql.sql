CREATE TABLE public."table_with_range_patition_$%{}[]()&*^!@""'`\/#"
(
    id integer,
    status text,
    arr numeric
) PARTITION BY RANGE (arr)
WITH (
    OIDS = FALSE
);

ALTER TABLE IF EXISTS public."table_with_range_patition_$%{}[]()&*^!@""'`\/#"
    OWNER to postgres;

CREATE TABLE public."cust_arr_small PARTITION" PARTITION OF public."table_with_range_patition_$%{}[]()&*^!@""'`\/#"
    FOR VALUES FROM (20) TO (25);
