ALTER MATERIALIZED VIEW IF EXISTS public."testmview_$%{}[]()&*^!/@`#"
SET(
  FILLFACTOR = 18
);

REFRESH MATERIALIZED VIEW public."testmview_$%{}[]()&*^!/@`#" WITH DATA;
