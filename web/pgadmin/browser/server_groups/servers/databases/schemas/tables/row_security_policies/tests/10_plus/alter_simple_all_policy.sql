-- POLICY: test_all_rls_policy_$%{}[]()&*^!@"'`\/#

-- DROP POLICY IF EXISTS "test_all_rls_policy_$%{}[]()&*^!@""'`\/#" ON public.test_rls_policy;

CREATE POLICY "test_all_rls_policy_$%{}[]()&*^!@""'`\/#"
    ON public.test_rls_policy
    AS RESTRICTIVE
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);
