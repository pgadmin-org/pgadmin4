-- Constraint: FKey_period

-- ALTER TABLE IF EXISTS testschema.test_period_table DROP CONSTRAINT IF EXISTS "FKey_period";

ALTER TABLE IF EXISTS testschema.test_period_table
    ADD CONSTRAINT "FKey_period" FOREIGN KEY (id, PERIOD valid_at)
    REFERENCES testschema.test_period_ref_table (id, PERIOD valid_at) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;
