-- Constraint: FKey_partitioned

-- ALTER TABLE IF EXISTS testschema.test_partitioned_table DROP CONSTRAINT IF EXISTS "FKey_partitioned";

ALTER TABLE IF EXISTS testschema.test_partitioned_table
    ADD CONSTRAINT "FKey_partitioned" FOREIGN KEY (ref_id)
    REFERENCES testschema.test_first_table (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;
