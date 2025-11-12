-- Constraint: FKey_$%{}[]()&*^!@"'`\/#

-- ALTER TABLE IF EXISTS testschema.test_second_table DROP CONSTRAINT IF EXISTS "FKey_$%{}[]()&*^!@""'`\/#";

ALTER TABLE IF EXISTS testschema.test_second_table
    ADD CONSTRAINT "FKey_$%{}[]()&*^!@""'`\/#" FOREIGN KEY (so_id)
    REFERENCES testschema.test_first_table (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;
