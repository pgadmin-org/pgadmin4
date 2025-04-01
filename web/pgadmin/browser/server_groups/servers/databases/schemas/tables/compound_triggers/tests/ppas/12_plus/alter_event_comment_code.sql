-- Compound Trigger: test_compound_trigger_$%{}[]()&*^!@"'`\/#

-- DROP TRIGGER IF EXISTS "test_compound_trigger_$%{}[]()&*^!@""'`\/#" ON testschema.table_for_compound_trigger;

CREATE OR REPLACE TRIGGER "test_compound_trigger_$%{}[]()&*^!@""'`\/#"
    FOR INSERT OR UPDATE
    ON testschema.table_for_compound_trigger
    WHEN ((new.id < 100))
    COMPOUND TRIGGER
var character varying(20) DEFAULT 'Global_var';

AFTER EACH ROW IS
BEGIN
	DBMS_OUTPUT.PUT_LINE('After each row: ' || var);
	var := 'AFTER EACH ROW';
END;
END "test_compound_trigger_$%{}[]()&*^!@""'`\/#";

COMMENT ON TRIGGER "test_compound_trigger_$%{}[]()&*^!@""'`\/#" ON testschema.table_for_compound_trigger
    IS 'This is test comment.';
