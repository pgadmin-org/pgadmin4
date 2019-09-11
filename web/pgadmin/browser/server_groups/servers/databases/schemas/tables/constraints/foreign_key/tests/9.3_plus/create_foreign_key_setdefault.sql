-- Constraint: FKey_$%{}[]()&*^!@"'`\/#

-- ALTER TABLE testschema.test_second_table DROP CONSTRAINT "FKey_$%{}[]()&*^!@""'`\/#";

ALTER TABLE testschema.test_second_table
    ADD CONSTRAINT "FKey_$%{}[]()&*^!@""'`\/#" FOREIGN KEY (so_id)
    REFERENCES testschema.test_first_table (id) MATCH SIMPLE
    ON UPDATE SET DEFAULT
    ON DELETE SET DEFAULT
    NOT VALID;
