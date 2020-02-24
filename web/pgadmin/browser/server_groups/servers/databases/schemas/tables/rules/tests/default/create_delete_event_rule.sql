-- Rule: "test_delete_rule_$%{}[]()&*^!@""'`\/#" ON public.test_emp_rule

-- DROP Rule "test_delete_rule_$%{}[]()&*^!@""'`\/#" ON public.test_emp_rule;

CREATE OR REPLACE RULE "test_delete_rule_$%{}[]()&*^!@""'`\/#" AS
    ON DELETE TO public.test_emp_rule
    DO NOTHING;
