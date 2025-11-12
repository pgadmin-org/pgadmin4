-- Rule: "test_insert_rule_$%{}[]()&*^!@""'`\/#" ON public.test_emp_rule

-- DROP Rule IF EXISTS "test_insert_rule_$%{}[]()&*^!@""'`\/#" ON public.test_emp_rule;

CREATE OR REPLACE RULE "test_insert_rule_$%{}[]()&*^!@""'`\/#" AS
    ON INSERT TO public.test_emp_rule
    WHERE (new.salary > 5000)
    DO
(UPDATE test_emp_rule SET salary = 5000
  WHERE (test_emp_rule.emp_id = new.emp_id));
