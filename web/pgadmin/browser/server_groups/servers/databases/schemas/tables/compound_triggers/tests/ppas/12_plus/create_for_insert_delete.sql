-- Compound Trigger: test_compound_trigger_$%{}[]()&*^!@"'`\/#

-- DROP TRIGGER IF EXISTS "test_compound_trigger_$%{}[]()&*^!@""'`\/#" ON testschema.table_for_compound_trigger;

CREATE OR REPLACE TRIGGER "test_compound_trigger_$%{}[]()&*^!@""'`\/#"
    FOR INSERT OR DELETE
    ON testschema.table_for_compound_trigger
    COMPOUND TRIGGER
BEFORE STATEMENT IS
BEGIN
	SELECT 1;
END;
END "test_compound_trigger_$%{}[]()&*^!@""'`\/#";
