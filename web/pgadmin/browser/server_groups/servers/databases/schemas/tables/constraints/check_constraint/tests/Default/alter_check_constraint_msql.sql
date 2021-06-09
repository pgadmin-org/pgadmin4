ALTER TABLE testschema.tableforcon
    RENAME CONSTRAINT "Chk_$%{}[]()&*^!@""'`\/#" TO "Chk_$%{}[]()&*^!@""'`\/#a";
ALTER TABLE testschema.tableforcon
    VALIDATE CONSTRAINT "Chk_$%{}[]()&*^!@""'`\/#a";
COMMENT ON CONSTRAINT "Chk_$%{}[]()&*^!@""'`\/#a" ON testschema.tableforcon
    IS 'Comment for alter';
