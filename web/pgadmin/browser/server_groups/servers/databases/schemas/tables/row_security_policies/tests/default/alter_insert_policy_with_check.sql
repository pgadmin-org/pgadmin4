-- POLICY: test_insert_rls_policy_update_name_$%{}[]()&*^!@"'`\/#

-- DROP POLICY "test_insert_rls_policy_update_name_$%{}[]()&*^!@""'`\/#" ON public.test_rls_policy;

CREATE POLICY "test_insert_rls_policy_update_name_$%{}[]()&*^!@""'`\/#"
    ON public.test_rls_policy
    FOR INSERT
    TO public
    WITH CHECK (((salary <> 0) AND (salary < 100000)));
