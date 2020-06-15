-- POLICY: test ON public.test_rls_policy

-- DROP POLICY test ON public.test_rls_policy;

CREATE POLICY test
    ON public.test_rls_policy
    FOR ALL
    TO public
;

