-- POLICY: select_policy

-- DROP POLICY select_policy ON public.test_rls_policy;

CREATE POLICY select_policy
    ON public.test_rls_policy
    AS PERMISSIVE
    FOR SELECT
    TO public;
