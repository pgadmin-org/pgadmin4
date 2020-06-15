
-- POLICY: test ON public.test_emp_rule

-- DROP POLICY test ON public.test_emp_rule;

CREATE POLICY test
    ON public.test_emp_rule
    FOR ALL
    TO public
;

