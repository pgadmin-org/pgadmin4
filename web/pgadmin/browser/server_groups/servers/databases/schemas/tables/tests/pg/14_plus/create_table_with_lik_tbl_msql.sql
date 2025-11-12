CREATE TABLE public."table_like_tbl$%{}[]()&*^!@""'`\/#"
(
    LIKE public.like_tbl
        INCLUDING DEFAULTS
        INCLUDING CONSTRAINTS
        INCLUDING INDEXES
        INCLUDING STORAGE
        INCLUDING COMMENTS
        INCLUDING COMPRESSION
        INCLUDING GENERATED
        INCLUDING IDENTITY
        INCLUDING STATISTICS

);

ALTER TABLE IF EXISTS public."table_like_tbl$%{}[]()&*^!@""'`\/#"
    OWNER to postgres;

COMMENT ON TABLE public."table_like_tbl$%{}[]()&*^!@""'`\/#"
    IS 'test ';
