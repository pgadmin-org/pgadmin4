-- View: public."testview1_$%{}[]()&*^!@""'`\/#"

-- DROP VIEW public."testview1_$%{}[]()&*^!@""'`\/#";

CREATE OR REPLACE VIEW public."testview1_$%{}[]()&*^!@""'`\/#"
WITH (
  check_option=cascaded,
  security_barrier=true
) AS
 SELECT test_view_table.col1
   FROM test_view_table;

ALTER TABLE public."testview1_$%{}[]()&*^!@""'`\/#"
    OWNER TO enterprisedb;
COMMENT ON VIEW public."testview1_$%{}[]()&*^!@""'`\/#"
    IS 'Testcomment-updated';

GRANT ALL ON TABLE public."testview1_$%{}[]()&*^!@""'`\/#" TO enterprisedb;
