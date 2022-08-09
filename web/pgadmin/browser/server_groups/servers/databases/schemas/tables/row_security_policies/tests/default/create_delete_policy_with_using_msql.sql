CREATE POLICY "test_delete_rls_policy_$%{}[]()&*^!@""'`\/#"
    ON public.test_rls_policy
    AS RESTRICTIVE
    FOR DELETE
    TO public
    USING (current_user = name);
