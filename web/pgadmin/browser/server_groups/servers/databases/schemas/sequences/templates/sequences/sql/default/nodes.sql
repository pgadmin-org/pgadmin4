SELECT cl.oid as oid, relname as name, relnamespace as schema
FROM pg_catalog.pg_class cl
WHERE
    relkind = 'S'
{% if scid %}
    AND relnamespace = {{scid|qtLiteral}}::oid
{% endif %}
{% if seid %}
    AND cl.oid = {{seid|qtLiteral}}::oid
{% endif %}
ORDER BY relname
