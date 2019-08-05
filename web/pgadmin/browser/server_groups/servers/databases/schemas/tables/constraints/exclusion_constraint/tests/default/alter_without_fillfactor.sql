-- Constraint: Exclusion_$%{}[]()&*^!@"'`\/#_1a

-- ALTER TABLE testschema.tableforexclusion DROP CONSTRAINT "Exclusion_$%{}[]()&*^!@""'`\/#_1a";

ALTER TABLE testschema.tableforexclusion
    ADD CONSTRAINT "Exclusion_$%{}[]()&*^!@""'`\/#_1a" EXCLUDE USING gist (
    col2 WITH <>);

COMMENT ON CONSTRAINT "Exclusion_$%{}[]()&*^!@""'`\/#_1a" ON testschema.tableforexclusion
    IS 'Comment for alter';
