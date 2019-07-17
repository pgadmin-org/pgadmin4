-- Constraint: Chk_$%{}[]()&*^!@"'`\/#

-- ALTER TABLE testschema.tableforcon DROP CONSTRAINT "Chk_$%{}[]()&*^!@""'`\/#";

ALTER TABLE testschema.tableforcon
    ADD CONSTRAINT "Chk_$%{}[]()&*^!@""'`\/#" CHECK (col1 > 1)
    NOT VALID;

COMMENT ON CONSTRAINT "Chk_$%{}[]()&*^!@""'`\/#" ON testschema.tableforcon
    IS 'Comment for create';
