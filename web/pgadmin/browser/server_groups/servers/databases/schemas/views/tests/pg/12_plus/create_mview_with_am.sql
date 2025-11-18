-- View: public.testmview_am_$%{}[]()&*^!/@`#

-- DROP MATERIALIZED VIEW IF EXISTS public."testmview_am_$%{}[]()&*^!/@`#";

CREATE MATERIALIZED VIEW IF NOT EXISTS public."testmview_am_$%{}[]()&*^!/@`#"
TABLESPACE pg_default
AS
 SELECT 1 AS col1
WITH NO DATA;

ALTER TABLE IF EXISTS public."testmview_am_$%{}[]()&*^!/@`#"
    OWNER TO postgres;

COMMENT ON MATERIALIZED VIEW public."testmview_am_$%{}[]()&*^!/@`#"
    IS 'comment1';