-- Constraint: FKey1_$%{}[]()&*^!@"'`\/#

-- ALTER TABLE testschema.test_second_table DROP CONSTRAINT "FKey1_$%{}[]()&*^!@""'`\/#";

ALTER TABLE testschema.test_second_table
    ADD CONSTRAINT "FKey1_$%{}[]()&*^!@""'`\/#" FOREIGN KEY (so_id)
    REFERENCES testschema.test_first_table (id) MATCH FULL
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    DEFERRABLE INITIALLY DEFERRED;

COMMENT ON CONSTRAINT "FKey1_$%{}[]()&*^!@""'`\/#" ON testschema.test_second_table
    IS 'Test Comment Update';
