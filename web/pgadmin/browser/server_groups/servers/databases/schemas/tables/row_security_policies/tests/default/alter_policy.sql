-- POLICY: policy_1

-- DROP POLICY IF EXISTS policy_1 ON public.test_rls_policy;

CREATE POLICY policy_1
    ON public.test_rls_policy
    AS PERMISSIVE
    FOR ALL
    TO public;
