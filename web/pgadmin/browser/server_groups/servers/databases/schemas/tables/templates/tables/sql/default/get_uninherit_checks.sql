{### CHECK constraints the table inherits from the given removed parents and from none of the remaining ones, ###}
{### which NO INHERIT would leave on the table as local constraints ###}
{% macro PARENT_CHECK(tables) %}
        SELECT 1 FROM pg_catalog.pg_constraint pc
        WHERE pc.conrelid = ANY(ARRAY[{% for val in tables %}{{val|qtLiteral(conn)}}::regclass::oid{% if not loop.last %}, {% endif %}{% endfor %}]::pg_catalog.oid[])
            AND pc.contype = 'c' AND NOT pc.connoinherit AND pc.conname = c.conname
{%- endmacro %}
SELECT c.conname AS name
FROM pg_catalog.pg_constraint c
WHERE c.conrelid = {{tid}}::oid AND c.contype = 'c' AND c.coninhcount > 0
    AND EXISTS ({{ PARENT_CHECK(removed) }})
    AND NOT EXISTS ({{ PARENT_CHECK(remaining) }})
ORDER BY c.conname
