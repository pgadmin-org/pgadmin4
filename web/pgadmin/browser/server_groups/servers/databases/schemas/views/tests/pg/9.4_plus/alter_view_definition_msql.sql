DROP VIEW public."testview_$%{}[]()&*^!@""'`\/#";
CREATE OR REPLACE VIEW public."testview_$%{}[]()&*^!@""'`\/#"
    AS
    SELECT * FROM test_view_table;
COMMENT ON VIEW public."testview_$%{}[]()&*^!@""'`\/#"
    IS 'Testcomment-updated';
GRANT ALL ON TABLE public."testview_$%{}[]()&*^!@""'`\/#" TO postgres;
