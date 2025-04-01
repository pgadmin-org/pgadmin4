CREATE TABLE public."simple_table_$%{}[]()&*^!@""'`\/#"
(
    col1 integer,
    col2 text,
    col3 boolean,
    col4 character varying(30),
    col5 numeric(20, 10),
    col6 timestamp(5) with time zone
);

ALTER TABLE IF EXISTS public."simple_table_$%{}[]()&*^!@""'`\/#"
    OWNER to enterprisedb;

COMMENT ON TABLE public."simple_table_$%{}[]()&*^!@""'`\/#"
    IS 'test comment';
