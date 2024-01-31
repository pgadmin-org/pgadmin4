-- Table: public.simple_table_storage_$%{}[]()&*^!@"'`\/#

-- DROP TABLE IF EXISTS public."simple_table_storage_$%{}[]()&*^!@""'`\/#";

CREATE TABLE IF NOT EXISTS public."simple_table_storage_$%{}[]()&*^!@""'`\/#"
(
    col4 character varying(30) STORAGE EXTERNAL COLLATE pg_catalog."default"
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."simple_table_storage_$%{}[]()&*^!@""'`\/#"
    OWNER to postgres;

COMMENT ON TABLE public."simple_table_storage_$%{}[]()&*^!@""'`\/#"
    IS 'test comment';
