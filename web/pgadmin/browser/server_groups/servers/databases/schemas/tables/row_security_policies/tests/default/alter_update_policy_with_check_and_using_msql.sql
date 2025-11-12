ALTER POLICY "test_update_rls_policy_$%{}[]()&*^!@""'`\/#" ON public.test_rls_policy
    USING (current_user=name);

ALTER POLICY "test_update_rls_policy_$%{}[]()&*^!@""'`\/#" ON public.test_rls_policy
    WITH CHECK (emp_id != 0);
