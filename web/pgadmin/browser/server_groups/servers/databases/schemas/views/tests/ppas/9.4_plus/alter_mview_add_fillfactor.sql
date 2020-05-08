-- View: public.testmview_$%{}[]()&*^!/@`#

-- DROP MATERIALIZED VIEW public."testmview_$%{}[]()&*^!/@`#";

CREATE MATERIALIZED VIEW public."testmview_$%{}[]()&*^!/@`#"
WITH (
    FILLFACTOR = 18
)
TABLESPACE pg_default
AS
 SELECT 12
WITH DATA;

ALTER TABLE public."testmview_$%{}[]()&*^!/@`#"
    OWNER TO enterprisedb;

COMMENT ON MATERIALIZED VIEW public."testmview_$%{}[]()&*^!/@`#"
    IS 'comment1';
