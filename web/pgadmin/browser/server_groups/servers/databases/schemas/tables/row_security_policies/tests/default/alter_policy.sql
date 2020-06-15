
-- POLICY: policy_1 ON public.test_emp_rule

-- DROP POLICY policy_1 ON public.test_emp_rule;

CREATE POLICY policy_1
    ON public.test_emp_rule
    FOR ALL
    TO public
;

