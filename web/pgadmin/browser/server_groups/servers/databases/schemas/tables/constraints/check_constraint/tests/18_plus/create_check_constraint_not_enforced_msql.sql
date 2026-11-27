ALTER TABLE IF EXISTS testschema.tableforcon
    ADD CONSTRAINT "Chk_enforced" CHECK (col1 > 5)
    NOT ENFORCED;
