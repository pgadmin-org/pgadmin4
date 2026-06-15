-- Constraint: Exclusion_$%{}[]()&*^!@"'`\/#a

-- ALTER TABLE IF EXISTS testschema.tableforexclusion DROP CONSTRAINT IF EXISTS "Exclusion_$%{}[]()&*^!@""'`\/#a";

ALTER TABLE IF EXISTS testschema.tableforexclusion
    ADD CONSTRAINT "Exclusion_$%{}[]()&*^!@""'`\/#a" EXCLUDE USING btree (
    col2 text_pattern_ops WITH =)
    INCLUDE (col1)
    WITH (FILLFACTOR=98)
    WHERE (col1 > 1)
    DEFERRABLE INITIALLY DEFERRED;

COMMENT ON CONSTRAINT "Exclusion_$%{}[]()&*^!@""'`\/#a" ON testschema.tableforexclusion
    IS 'Comment for alter';
