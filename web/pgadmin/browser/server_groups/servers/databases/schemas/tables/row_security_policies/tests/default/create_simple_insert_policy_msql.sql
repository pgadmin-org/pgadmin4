CREATE POLICY "test_simple_insert_rls_policy_$%{}[]()&*^!@""'`\/#"
    ON public.test_rls_policy
    AS PERMISSIVE
    FOR INSERT
    TO public;
