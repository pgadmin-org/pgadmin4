DROP MATERIALIZED VIEW IF EXISTS public."testmview_$%{}[]()&*^!/@`#";
CREATE MATERIALIZED VIEW IF NOT EXISTS public."testmview_$%{}[]()&*^!/@`#"
 AS
SELECT 12
 WITH NO DATA;

COMMENT ON MATERIALIZED VIEW public."testmview_$%{}[]()&*^!/@`#"
    IS 'comment1';
