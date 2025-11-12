-- Constraint: Exclusion_$%{}[]()&*^!@"'`\/#

-- ALTER TABLE IF EXISTS testschema.tableforexclusion DROP CONSTRAINT IF EXISTS "Exclusion_$%{}[]()&*^!@""'`\/#";

ALTER TABLE IF EXISTS testschema.tableforexclusion
    ADD CONSTRAINT "Exclusion_$%{}[]()&*^!@""'`\/#" EXCLUDE USING gist (
    col2 WITH <>)
    WITH (FILLFACTOR=12)
    WHERE (col1 > 1)
    DEFERRABLE INITIALLY DEFERRED;

COMMENT ON CONSTRAINT "Exclusion_$%{}[]()&*^!@""'`\/#" ON testschema.tableforexclusion
    IS 'Comment for create';
