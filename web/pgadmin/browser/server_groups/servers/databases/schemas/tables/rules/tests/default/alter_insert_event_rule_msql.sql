ALTER RULE "test_insert_rule_$%{}[]()&*^!@""'`\/#" ON public.test_emp_rule RENAME TO "test_insert_rule1_$%{}[]()&*^!@""'`\/#";

CREATE OR REPLACE RULE "test_insert_rule1_$%{}[]()&*^!@""'`\/#" AS
    ON INSERT TO public.test_emp_rule
    WHERE (new.salary > 8000)
    DO INSTEAD
(UPDATE test_emp_rule SET salary = 8000
	WHERE test_emp_rule.emp_id = new.emp_id);

COMMENT ON RULE "test_insert_rule1_$%{}[]()&*^!@""'`\/#" ON public.test_emp_rule IS 'This is a insert rule';
