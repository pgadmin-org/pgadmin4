{### Inheritable CHECK constraints of the given parents that the table does not have yet ###}
SELECT name, definition FROM (
    SELECT DISTINCT ON (c.conname) c.conname AS name,
        pg_catalog.pg_get_constraintdef(c.oid, true) AS definition, p.ord
    FROM
        pg_catalog.unnest(ARRAY[{% for val in parents %}{{val|qtLiteral(conn)}}::regclass::oid{% if not loop.last %}, {% endif %}{% endfor %}])
            WITH ORDINALITY AS p(oid, ord)
    JOIN
        pg_catalog.pg_constraint c ON c.conrelid = p.oid
    WHERE c.contype = 'c' AND NOT c.connoinherit
        AND NOT EXISTS (
            SELECT 1 FROM pg_catalog.pg_constraint cc
            WHERE cc.conrelid = {{tid}}::oid AND cc.contype = 'c'
                AND cc.conname = c.conname)
    ORDER BY c.conname, p.ord
) checks
ORDER BY ord, name
