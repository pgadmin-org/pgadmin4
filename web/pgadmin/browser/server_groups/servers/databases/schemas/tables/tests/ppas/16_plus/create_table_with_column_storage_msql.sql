CREATE TABLE public."simple_table_storage_$%{}[]()&*^!@""'`\/#"
(
    col4 character varying(30) STORAGE EXTERNAL
);

ALTER TABLE IF EXISTS public."simple_table_storage_$%{}[]()&*^!@""'`\/#"
    OWNER to enterprisedb;

COMMENT ON TABLE public."simple_table_storage_$%{}[]()&*^!@""'`\/#"
    IS 'test comment';
