-- View: public.testview_$%{}[]()&*^!@"'`\/#

-- DROP VIEW public."testview_$%{}[]()&*^!@""'`\/#";

CREATE OR REPLACE VIEW public."testview_$%{}[]()&*^!@""'`\/#"
WITH (
  check_option=local
) AS
 SELECT col1
   FROM test_view_table;

ALTER TABLE IF EXISTS public."testview_$%{}[]()&*^!@""'`\/#"
    OWNER TO enterprisedb;
COMMENT ON VIEW public."testview_$%{}[]()&*^!@""'`\/#"
    IS 'Testcomment';

GRANT ALL ON TABLE public."testview_$%{}[]()&*^!@""'`\/#" TO enterprisedb;
