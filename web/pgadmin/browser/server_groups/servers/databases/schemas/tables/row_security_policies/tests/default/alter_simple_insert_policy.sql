-- POLICY: test_simple_insert_rls_policy_$%{}[]()&*^!@"'`\/#

-- DROP POLICY IF EXISTS "test_simple_insert_rls_policy_$%{}[]()&*^!@""'`\/#" ON public.test_rls_policy;

CREATE POLICY "test_simple_insert_rls_policy_$%{}[]()&*^!@""'`\/#"
    ON public.test_rls_policy
    FOR INSERT
    TO public
    WITH CHECK ((("current_user"())::text = name));
