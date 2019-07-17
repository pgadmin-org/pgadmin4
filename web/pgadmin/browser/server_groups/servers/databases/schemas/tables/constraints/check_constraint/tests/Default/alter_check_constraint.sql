-- Constraint: Chk_$%{}[]()&*^!@"'`\/#a

-- ALTER TABLE testschema.tableforcon DROP CONSTRAINT "Chk_$%{}[]()&*^!@""'`\/#a";

ALTER TABLE testschema.tableforcon
    ADD CONSTRAINT "Chk_$%{}[]()&*^!@""'`\/#a" CHECK (col1 > 1);

COMMENT ON CONSTRAINT "Chk_$%{}[]()&*^!@""'`\/#a" ON testschema.tableforcon
    IS 'Comment for alter';
