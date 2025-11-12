ALTER RULE "test_delete_rule_$%{}[]()&*^!@""'`\/#" ON public.test_emp_rule RENAME TO "test_delete_rule1_$%{}[]()&*^!@""'`\/#";

CREATE OR REPLACE RULE "test_delete_rule1_$%{}[]()&*^!@""'`\/#" AS
    ON DELETE TO public.test_emp_rule
    DO INSTEAD
(DELETE FROM test_emp_rule
  WHERE test_emp_rule.name = old.name);

COMMENT ON RULE "test_delete_rule1_$%{}[]()&*^!@""'`\/#" ON public.test_emp_rule IS 'This is a delete rule';
