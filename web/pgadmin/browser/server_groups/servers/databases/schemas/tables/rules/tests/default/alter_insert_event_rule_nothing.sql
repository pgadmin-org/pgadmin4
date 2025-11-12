-- Rule: "test_insert_rule1_$%{}[]()&*^!@""'`\/#" ON public.test_emp_rule

-- DROP Rule IF EXISTS "test_insert_rule1_$%{}[]()&*^!@""'`\/#" ON public.test_emp_rule;

CREATE OR REPLACE RULE "test_insert_rule1_$%{}[]()&*^!@""'`\/#" AS
    ON INSERT TO public.test_emp_rule
    WHERE (new.salary > 8000)
    DO INSTEAD NOTHING;

COMMENT ON RULE "test_insert_rule1_$%{}[]()&*^!@""'`\/#" ON public.test_emp_rule IS 'This is a insert rule';
