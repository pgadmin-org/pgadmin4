-- POLICY: select_policy

-- DROP POLICY select_policy ON public.test_rls_policy;

CREATE POLICY select_policy
    ON public.test_rls_policy
    FOR SELECT
    TO public;

