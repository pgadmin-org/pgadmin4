-- POLICY: all_event_policy

-- DROP POLICY IF EXISTS all_event_policy ON public.test_rls_policy;

CREATE POLICY all_event_policy
    ON public.test_rls_policy
    AS RESTRICTIVE
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);
