CREATE OR REPLACE RULE "test_update_rule_$%{}[]()&*^!@""'`\/#" AS
    ON UPDATE TO public.test_emp_rule
    WHERE (old.name = 'Joe')
    DO
(UPDATE test_emp_rule SET salary = new.salary
  WHERE test_emp_rule.name = 'Sam');
