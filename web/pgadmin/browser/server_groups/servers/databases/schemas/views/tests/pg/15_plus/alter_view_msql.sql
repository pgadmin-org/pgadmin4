ALTER VIEW IF EXISTS public."testview_$%{}[]()&*^!@""'`\/#"
    SET (security_barrier=true);
ALTER VIEW IF EXISTS public."testview_$%{}[]()&*^!@""'`\/#"
    SET (security_invoker=true);
ALTER VIEW IF EXISTS public."testview_$%{}[]()&*^!@""'`\/#"
    SET (check_option=cascaded);

COMMENT ON VIEW public."testview_$%{}[]()&*^!@""'`\/#"
    IS 'Testcomment-updated';
