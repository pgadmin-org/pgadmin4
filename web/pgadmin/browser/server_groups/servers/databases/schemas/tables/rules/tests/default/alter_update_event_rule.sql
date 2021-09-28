-- Rule: "test_update_rule1_$%{}[]()&*^!@""'`\/#" ON public.test_emp_rule

-- DROP Rule IF EXISTS "test_update_rule1_$%{}[]()&*^!@""'`\/#" ON public.test_emp_rule;

CREATE OR REPLACE RULE "test_update_rule1_$%{}[]()&*^!@""'`\/#" AS
    ON UPDATE TO public.test_emp_rule
    WHERE (old.name = 'Sam'::text)
    DO INSTEAD
(UPDATE test_emp_rule SET salary = new.salary
  WHERE (test_emp_rule.name = 'Joe'::text));

COMMENT ON RULE "test_update_rule1_$%{}[]()&*^!@""'`\/#" ON public.test_emp_rule IS 'This is a update rule';
