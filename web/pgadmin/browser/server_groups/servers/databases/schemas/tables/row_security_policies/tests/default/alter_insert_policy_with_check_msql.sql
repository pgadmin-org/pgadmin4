ALTER POLICY "test_insert_rls_policy_$%{}[]()&*^!@""'`\/#" ON public.test_rls_policy
    WITH CHECK ((salary <> 0) AND (salary < 100000));

ALTER POLICY "test_insert_rls_policy_$%{}[]()&*^!@""'`\/#" ON public.test_rls_policy
    RENAME TO "test_insert_rls_policy_update_name_$%{}[]()&*^!@""'`\/#";
