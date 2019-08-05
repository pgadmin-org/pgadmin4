-- Constraint: Exclusion_$%{}[]()&*^!@"'`\/#a

-- ALTER TABLE testschema.tableforexclusion DROP CONSTRAINT "Exclusion_$%{}[]()&*^!@""'`\/#a";

ALTER TABLE testschema.tableforexclusion
    ADD CONSTRAINT "Exclusion_$%{}[]()&*^!@""'`\/#a" EXCLUDE USING btree (
    col2 text_pattern_ops WITH =)
    INCLUDE (col1)
    WITH (FILLFACTOR=98)
    WHERE (col1 > 1)
    DEFERRABLE INITIALLY DEFERRED;

COMMENT ON CONSTRAINT "Exclusion_$%{}[]()&*^!@""'`\/#a" ON testschema.tableforexclusion
    IS 'Comment for alter';
