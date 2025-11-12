CREATE MATERIALIZED VIEW public."testmview_am_$%{}[]()&*^!/@`#"
USING heap
TABLESPACE pg_default
AS
SELECT 1 AS col1
WITH NO DATA;

ALTER TABLE IF EXISTS public."testmview_am_$%{}[]()&*^!/@`#"
    OWNER TO postgres;

COMMENT ON MATERIALIZED VIEW public."testmview_am_$%{}[]()&*^!/@`#"
    IS 'comment1';
