-- Constraint: Exclusion_$%{}[]()&*^!@"'`\/#a

-- ALTER TABLE testschema.tableforexclusion DROP CONSTRAINT "Exclusion_$%{}[]()&*^!@""'`\/#a";

ALTER TABLE testschema.tableforexclusion
    ADD CONSTRAINT "Exclusion_$%{}[]()&*^!@""'`\/#a" EXCLUDE USING gist (
    col2 WITH <>)
    WITH (FILLFACTOR=98)
    WHERE (col1 > 1)
    DEFERRABLE INITIALLY DEFERRED;

COMMENT ON CONSTRAINT "Exclusion_$%{}[]()&*^!@""'`\/#a" ON testschema.tableforexclusion
    IS 'Comment for alter';
