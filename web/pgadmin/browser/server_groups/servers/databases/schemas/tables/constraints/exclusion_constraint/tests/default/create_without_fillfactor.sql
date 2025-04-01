-- Constraint: Exclusion_$%{}[]()&*^!@"'`\/#_1

-- ALTER TABLE IF EXISTS testschema.tableforexclusion DROP CONSTRAINT IF EXISTS "Exclusion_$%{}[]()&*^!@""'`\/#_1";

ALTER TABLE IF EXISTS testschema.tableforexclusion
    ADD CONSTRAINT "Exclusion_$%{}[]()&*^!@""'`\/#_1" EXCLUDE USING gist (
    col2 WITH <>)
    WITH (FILLFACTOR=12);

COMMENT ON CONSTRAINT "Exclusion_$%{}[]()&*^!@""'`\/#_1" ON testschema.tableforexclusion
    IS 'Comment for create';
