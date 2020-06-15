
-- POLICY: insert_policy ON public.test_emp_rule

-- DROP POLICY insert_policy ON public.test_emp_rule;

CREATE POLICY insert_policy
    ON public.test_emp_rule
    FOR INSERT
    TO public
;

