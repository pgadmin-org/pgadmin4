-- POLICY: insert_policy

-- DROP POLICY insert_policy ON public.test_rls_policy;

CREATE POLICY insert_policy
    ON public.test_rls_policy
    AS PERMISSIVE
    FOR INSERT
    TO public;
