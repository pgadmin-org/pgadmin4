
-- POLICY: select_policy ON public.test_emp_rule

-- DROP POLICY select_policy ON public.test_emp_rule;

CREATE POLICY select_policy
    ON public.test_emp_rule
    FOR SELECT
    TO public
;

