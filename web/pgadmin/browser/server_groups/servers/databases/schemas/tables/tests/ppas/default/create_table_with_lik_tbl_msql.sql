CREATE TABLE public."table_like_tbl$%{}[]()&*^!@""'`\/#"
(
    LIKE public.like_tbl
        INCLUDING DEFAULTS
        INCLUDING CONSTRAINTS
        INCLUDING INDEXES
        INCLUDING STORAGE
        INCLUDING COMMENTS

)
WITH (
    OIDS = FALSE
);

ALTER TABLE IF EXISTS public."table_like_tbl$%{}[]()&*^!@""'`\/#"
    OWNER to enterprisedb;

COMMENT ON TABLE public."table_like_tbl$%{}[]()&*^!@""'`\/#"
    IS 'test ';
