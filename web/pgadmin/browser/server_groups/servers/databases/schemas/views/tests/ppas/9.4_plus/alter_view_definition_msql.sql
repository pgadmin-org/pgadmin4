CREATE OR REPLACE VIEW public."testview_$%{}[]()&*^!@""'`\/#"
    WITH (check_option=cascaded, security_barrier=true)
    AS
    SELECT * FROM test_view_table;
