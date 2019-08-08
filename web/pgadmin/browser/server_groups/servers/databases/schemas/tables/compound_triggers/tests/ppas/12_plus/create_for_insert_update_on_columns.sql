-- Compound Trigger: test_compound_trigger_$%{}[]()&*^!@"'`\/#

-- DROP TRIGGER "test_compound_trigger_$%{}[]()&*^!@""'`\/#" ON testschema.table_for_compound_trigger;

CREATE OR REPLACE TRIGGER "test_compound_trigger_$%{}[]()&*^!@""'`\/#"
    FOR INSERT OR UPDATE OF id, name
    ON testschema.table_for_compound_trigger
    COMPOUND TRIGGER
var character varying(20) DEFAULT 'Global_var';

BEFORE STATEMENT IS
BEGIN
	DBMS_OUTPUT.PUT_LINE('Before Statement: ' || var);
	var := 'BEFORE STATEMENT';
END;

BEFORE EACH ROW IS
BEGIN
	DBMS_OUTPUT.PUT_LINE('Before each row: ' || var);
	var := 'BEFORE EACH ROW';
END;
END "test_compound_trigger_$%{}[]()&*^!@""'`\/#";
