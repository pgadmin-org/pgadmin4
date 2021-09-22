CREATE VIEW public."testview_$%{}[]()&*^!@""'`\/#"
WITH (
  check_option=local
) AS
select col1 from test_view_table;

ALTER TABLE IF EXISTS public."testview_$%{}[]()&*^!@""'`\/#"
    OWNER TO enterprisedb;
COMMENT ON VIEW public."testview_$%{}[]()&*^!@""'`\/#"
    IS 'Testcomment';

GRANT INSERT ON TABLE public."testview_$%{}[]()&*^!@""'`\/#" TO enterprisedb;
