ALTER POLICY "test_simple_insert_rls_policy_$%{}[]()&*^!@""'`\/#" ON public.test_rls_policy
    WITH CHECK (current_user = name);
