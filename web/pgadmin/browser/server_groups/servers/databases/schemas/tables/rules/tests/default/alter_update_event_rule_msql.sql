ALTER RULE "test_update_rule_$%{}[]()&*^!@""'`\/#" ON public.test_emp_rule RENAME TO "test_update_rule1_$%{}[]()&*^!@""'`\/#";

CREATE OR REPLACE RULE "test_update_rule1_$%{}[]()&*^!@""'`\/#" AS
    ON UPDATE TO public.test_emp_rule
    WHERE (old.name = 'Sam')
    DO INSTEAD
(UPDATE test_emp_rule SET salary = new.salary
	WHERE test_emp_rule.name = 'Joe');

COMMENT ON RULE "test_update_rule1_$%{}[]()&*^!@""'`\/#" ON public.test_emp_rule IS 'This is a update rule';
