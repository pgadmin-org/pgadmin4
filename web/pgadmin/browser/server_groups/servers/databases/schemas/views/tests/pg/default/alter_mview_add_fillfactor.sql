-- View: public.testmview_$%{}[]()&*^!/@`#

-- DROP MATERIALIZED VIEW IF EXISTS public."testmview_$%{}[]()&*^!/@`#";

CREATE MATERIALIZED VIEW IF NOT EXISTS public."testmview_$%{}[]()&*^!/@`#"
WITH (
    FILLFACTOR = 18
)
TABLESPACE pg_default
AS
 SELECT 12 AS col1
WITH DATA;

ALTER TABLE IF EXISTS public."testmview_$%{}[]()&*^!/@`#"
    OWNER TO postgres;

COMMENT ON MATERIALIZED VIEW public."testmview_$%{}[]()&*^!/@`#"
    IS 'comment1';
