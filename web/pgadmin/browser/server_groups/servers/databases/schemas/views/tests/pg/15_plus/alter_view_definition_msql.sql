DROP VIEW public."testview_$%{}[]()&*^!@""'`\/#";

CREATE OR REPLACE VIEW public."testview_$%{}[]()&*^!@""'`\/#"
    WITH (check_option=cascaded, security_barrier=true, security_invoker=true)
    AS
    SELECT * FROM test_view_table;

ALTER TABLE public."testview_$%{}[]()&*^!@""'`\/#"
    OWNER TO postgres;
COMMENT ON VIEW public."testview_$%{}[]()&*^!@""'`\/#"
    IS 'Testcomment-updated';
GRANT ALL ON TABLE public."testview_$%{}[]()&*^!@""'`\/#" TO postgres;
