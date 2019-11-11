-- Compound Trigger: test_compound_trigger_$%{}[]()&*^!@"'`\/#

-- DROP TRIGGER "test_compound_trigger_$%{}[]()&*^!@""'`\/#" ON testschema.table_for_compound_trigger;

CREATE OR REPLACE TRIGGER "test_compound_trigger_$%{}[]()&*^!@""'`\/#"
    FOR INSERT
    ON testschema.table_for_compound_trigger
    WHEN ((new.id < 100))
    COMPOUND TRIGGER
var character varying(20) DEFAULT 'Global_var';

BEFORE EACH ROW IS
BEGIN
	DBMS_OUTPUT.PUT_LINE('Before each row: ' || var);
	var := 'BEFORE EACH ROW';
END;
END "test_compound_trigger_$%{}[]()&*^!@""'`\/#";
