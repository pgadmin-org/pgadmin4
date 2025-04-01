SELECT COUNT(*)
FROM pg_catalog.pg_type t
    LEFT OUTER JOIN pg_catalog.pg_class ct ON ct.oid=t.typrelid AND ct.relkind <> 'c'
WHERE t.typtype != 'd' AND t.typname NOT LIKE E'\\_%' AND t.typnamespace = {{scid}}::oid
{% if not showsysobj %}
    AND ct.oid is NULL
{% endif %}
