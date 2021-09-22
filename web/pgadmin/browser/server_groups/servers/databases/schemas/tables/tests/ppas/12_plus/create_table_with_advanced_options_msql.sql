CREATE UNLOGGED TABLE public."table_with_advanced_options_$%{}[]()&*^!@""'`\/#"
(
    col1 double precision,
    col2 numrange
)

WITH (
    FILLFACTOR = 50
);

ALTER TABLE IF EXISTS public."table_with_advanced_options_$%{}[]()&*^!@""'`\/#"
    OWNER to enterprisedb;

ALTER TABLE IF EXISTS public."table_with_advanced_options_$%{}[]()&*^!@""'`\/#"
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public."table_with_advanced_options_$%{}[]()&*^!@""'`\/#"
    FORCE ROW LEVEL SECURITY;

COMMENT ON TABLE public."table_with_advanced_options_$%{}[]()&*^!@""'`\/#"
    IS 'test comment';
