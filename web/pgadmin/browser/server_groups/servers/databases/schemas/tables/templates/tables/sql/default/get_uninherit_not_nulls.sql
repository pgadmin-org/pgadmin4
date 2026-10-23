{### Columns kept through a remaining parent that are NOT NULL only because of the given removed parents, ###}
{### which NO INHERIT would leave NOT NULL. A primary key or replica identity column must stay NOT NULL. ###}
{% macro PARENT_COLUMN(tables, not_null) %}
        SELECT 1 FROM pg_catalog.pg_attribute pa
        WHERE pa.attrelid = ANY(ARRAY[{% for val in tables %}{{val|qtLiteral(conn)}}::regclass::oid{% if not loop.last %}, {% endif %}{% endfor %}]::pg_catalog.oid[])
            AND pa.attname = a.attname AND pa.attnum > 0 AND NOT pa.attisdropped
            {% if not_null %}AND pa.attnotnull{% endif %}
{%- endmacro %}
SELECT a.attname AS name
FROM pg_catalog.pg_attribute a
WHERE a.attrelid = {{tid}}::oid AND a.attnum > 0 AND NOT a.attisdropped AND a.attnotnull
    AND EXISTS ({{ PARENT_COLUMN(removed, true) }})
    AND EXISTS ({{ PARENT_COLUMN(remaining, false) }})
    AND NOT EXISTS ({{ PARENT_COLUMN(remaining, true) }})
    AND NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_index i
        WHERE i.indrelid = a.attrelid AND (i.indisprimary OR i.indisreplident)
            AND a.attnum = ANY(i.indkey))
ORDER BY a.attnum
