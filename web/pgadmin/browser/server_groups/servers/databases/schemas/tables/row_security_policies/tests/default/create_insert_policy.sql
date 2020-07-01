-- POLICY: insert_policy

-- DROP POLICY insert_policy ON public.test_rls_policy;

CREATE POLICY insert_policy
    ON public.test_rls_policy
    FOR INSERT
    TO public;

