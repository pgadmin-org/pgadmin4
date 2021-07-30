-- POLICY: test_select_policy_rls_$%{}[]()&*^!@"'`\/#

-- DROP POLICY IF EXISTS "test_select_policy_rls_$%{}[]()&*^!@""'`\/#" ON public.test_rls_policy;

CREATE POLICY "test_select_policy_rls_$%{}[]()&*^!@""'`\/#"
    ON public.test_rls_policy
    AS PERMISSIVE
    FOR SELECT
    TO public
    USING ((name = CURRENT_USER));
