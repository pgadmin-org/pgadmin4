ALTER VIEW IF EXISTS public."testview_$%{}[]()&*^!@""'`\/#"
    SET (security_barrier=true);
ALTER VIEW IF EXISTS public."testview_$%{}[]()&*^!@""'`\/#"
    SET (check_option=cascaded);
GRANT SELECT ON TABLE public."testview_$%{}[]()&*^!@""'`\/#" TO PUBLIC;
