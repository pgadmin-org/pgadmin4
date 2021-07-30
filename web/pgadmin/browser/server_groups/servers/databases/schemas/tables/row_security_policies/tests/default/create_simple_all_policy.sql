-- POLICY: test_all_rls_policy_$%{}[]()&*^!@"'`\/#

-- DROP POLICY IF EXISTS "test_all_rls_policy_$%{}[]()&*^!@""'`\/#" ON public.test_rls_policy;

CREATE POLICY "test_all_rls_policy_$%{}[]()&*^!@""'`\/#"
    ON public.test_rls_policy
    FOR ALL
    TO public;
