ALTER TABLE testschema.test_second_table
    RENAME CONSTRAINT "FKey_$%{}[]()&*^!@""'`\/#" TO "FKey1_$%{}[]()&*^!@""'`\/#";

ALTER TABLE testschema.test_second_table
    VALIDATE CONSTRAINT "FKey1_$%{}[]()&*^!@""'`\/#";

COMMENT ON CONSTRAINT "FKey1_$%{}[]()&*^!@""'`\/#" ON testschema.test_second_table
    IS 'Test Comment Update';
