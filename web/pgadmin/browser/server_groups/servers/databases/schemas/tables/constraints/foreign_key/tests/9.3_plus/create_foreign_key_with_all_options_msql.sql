ALTER TABLE IF EXISTS testschema.test_second_table
    ADD CONSTRAINT "FKey_$%{}[]()&*^!@""'`\/#" FOREIGN KEY (so_id)
    REFERENCES testschema.test_first_table (id) MATCH FULL
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    DEFERRABLE INITIALLY DEFERRED
    NOT VALID;

COMMENT ON CONSTRAINT "FKey_$%{}[]()&*^!@""'`\/#" ON testschema.test_second_table
    IS 'Test Comment';

CREATE INDEX IF NOT EXISTS "fki_FKey_$%{}[]()&*^!@""'`\/#"
    ON testschema.test_second_table(so_id);
