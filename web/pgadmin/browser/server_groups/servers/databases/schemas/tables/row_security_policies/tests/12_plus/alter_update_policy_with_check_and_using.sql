-- POLICY: test_update_rls_policy_$%{}[]()&*^!@"'`\/#

-- DROP POLICY IF EXISTS "test_update_rls_policy_$%{}[]()&*^!@""'`\/#" ON public.test_rls_policy;

CREATE POLICY "test_update_rls_policy_$%{}[]()&*^!@""'`\/#"
    ON public.test_rls_policy
    AS RESTRICTIVE
    FOR UPDATE
    TO public
    USING ((CURRENT_USER = name))
    WITH CHECK ((emp_id <> 0));
