-- View: public.testview_$%{}[]()&*^!@"'`\/#

-- DROP VIEW public."testview_$%{}[]()&*^!@""'`\/#";

CREATE OR REPLACE VIEW public."testview_$%{}[]()&*^!@""'`\/#"
WITH (
  check_option=cascaded,
  security_barrier=true
) AS
 SELECT test_view_table.col1
   FROM test_view_table;

ALTER TABLE public."testview_$%{}[]()&*^!@""'`\/#"
    OWNER TO enterprisedb;
COMMENT ON VIEW public."testview_$%{}[]()&*^!@""'`\/#"
    IS 'Testcomment-updated';

GRANT SELECT ON TABLE public."testview_$%{}[]()&*^!@""'`\/#" TO PUBLIC;

