-- Constraint: FKey_$%{}[]()&*^!@"'`\/#

-- ALTER TABLE IF EXISTS testschema.test_second_table DROP CONSTRAINT IF EXISTS "FKey_$%{}[]()&*^!@""'`\/#";

ALTER TABLE IF EXISTS testschema.test_second_table
    ADD CONSTRAINT "FKey_$%{}[]()&*^!@""'`\/#" FOREIGN KEY (so_id)
    REFERENCES testschema.test_first_table (id) MATCH FULL
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    DEFERRABLE INITIALLY DEFERRED
    NOT VALID;

COMMENT ON CONSTRAINT "FKey_$%{}[]()&*^!@""'`\/#" ON testschema.test_second_table
    IS 'Test Comment';
