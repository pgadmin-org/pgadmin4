-- Compound Trigger: test_compound_trigger_$%{}[]()&*^!@"'`\/#

-- DROP TRIGGER IF EXISTS "test_compound_trigger_$%{}[]()&*^!@""'`\/#" ON testschema.table_for_compound_trigger;

CREATE OR REPLACE TRIGGER "test_compound_trigger_$%{}[]()&*^!@""'`\/#"
    FOR INSERT OR DELETE OR TRUNCATE OR UPDATE
    ON testschema.table_for_compound_trigger
    COMPOUND TRIGGER
var character varying(20) DEFAULT 'Global_var';

BEFORE STATEMENT IS
BEGIN
	DBMS_OUTPUT.PUT_LINE('Before Statement: ' || var);
	var := 'BEFORE STATEMENT';
END;
END "test_compound_trigger_$%{}[]()&*^!@""'`\/#";
