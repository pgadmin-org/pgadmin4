-- POLICY: test_update_rls_policy_$%{}[]()&*^!@"'`\/#

-- DROP POLICY IF EXISTS "test_update_rls_policy_$%{}[]()&*^!@""'`\/#" ON public.test_rls_policy;

CREATE POLICY "test_update_rls_policy_$%{}[]()&*^!@""'`\/#"
    ON public.test_rls_policy
    FOR UPDATE
    TO public
    USING ((("current_user"())::text = name))
    WITH CHECK ((emp_id <> 0));
