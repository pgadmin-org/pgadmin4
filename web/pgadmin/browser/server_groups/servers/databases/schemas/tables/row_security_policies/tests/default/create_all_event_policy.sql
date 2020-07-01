-- POLICY: all_event_policy

-- DROP POLICY all_event_policy ON public.test_rls_policy;

CREATE POLICY all_event_policy
    ON public.test_rls_policy
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

