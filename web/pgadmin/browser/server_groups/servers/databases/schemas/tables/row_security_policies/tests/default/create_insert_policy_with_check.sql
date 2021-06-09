-- POLICY: test_insert_rls_policy_$%{}[]()&*^!@"'`\/#

-- DROP POLICY "test_insert_rls_policy_$%{}[]()&*^!@""'`\/#" ON public.test_rls_policy;

CREATE POLICY "test_insert_rls_policy_$%{}[]()&*^!@""'`\/#"
    ON public.test_rls_policy
    FOR INSERT
    TO public
    WITH CHECK (((salary <> 0) AND (salary > 0)));
