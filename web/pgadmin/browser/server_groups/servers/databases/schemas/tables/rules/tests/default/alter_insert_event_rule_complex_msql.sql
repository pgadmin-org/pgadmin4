CREATE OR REPLACE RULE "test_insert_rule1_$%{}[]()&*^!@""'`\/#" AS
    ON INSERT TO public.test_emp_rule
    WHERE (new.salary > 8000)
    DO INSTEAD
(UPDATE test_emp_rule SET salary = 8000
	WHERE test_emp_rule.emp_id = new.emp_id;
INSERT INTO test_emp_rule(emp_id, name, salary)
SELECT 1, 'xyz', 2000 WHERE 1=2);
