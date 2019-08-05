-- Constraint: Exclusion_$%{}[]()&*^!@"'`\/#_1

-- ALTER TABLE testschema.tableforexclusion DROP CONSTRAINT "Exclusion_$%{}[]()&*^!@""'`\/#_1";

ALTER TABLE testschema.tableforexclusion
    ADD CONSTRAINT "Exclusion_$%{}[]()&*^!@""'`\/#_1" EXCLUDE USING gist (
    col2 WITH <>)
    WITH (FILLFACTOR=12);

COMMENT ON CONSTRAINT "Exclusion_$%{}[]()&*^!@""'`\/#_1" ON testschema.tableforexclusion
    IS 'Comment for create';
