CREATE MATERIALIZED VIEW public."testmview_$%{}[]()&*^!/@`#"
TABLESPACE pg_default
AS
SELECT 1 AS col1
WITH NO DATA;

ALTER TABLE IF EXISTS public."testmview_$%{}[]()&*^!/@`#"
    OWNER TO enterprisedb;

COMMENT ON MATERIALIZED VIEW public."testmview_$%{}[]()&*^!/@`#"
    IS 'comment1';
