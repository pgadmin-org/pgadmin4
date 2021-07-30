-- Constraint: Exclusion_$%{}[]()&*^!@"'`\/#_1a

-- ALTER TABLE IF EXISTS testschema.tableforexclusion DROP CONSTRAINT IF EXISTS "Exclusion_$%{}[]()&*^!@""'`\/#_1a";

ALTER TABLE IF EXISTS testschema.tableforexclusion
    ADD CONSTRAINT "Exclusion_$%{}[]()&*^!@""'`\/#_1a" EXCLUDE USING gist (
    col2 WITH <>);

COMMENT ON CONSTRAINT "Exclusion_$%{}[]()&*^!@""'`\/#_1a" ON testschema.tableforexclusion
    IS 'Comment for alter';
