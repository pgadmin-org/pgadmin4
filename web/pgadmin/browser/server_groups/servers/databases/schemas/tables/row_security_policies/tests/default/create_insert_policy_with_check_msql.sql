CREATE POLICY "test_insert_rls_policy_$%{}[]()&*^!@""'`\/#"
    ON public.test_rls_policy
    FOR INSERT
    TO public
    WITH CHECK (salary != 0 and salary > 0);
