SELECT COUNT(*)
FROM pg_catalog.pg_class cl
WHERE
    relkind = 'S'
{% if scid %}
    AND relnamespace = {{scid|qtLiteral(conn)}}::oid
{% endif %}
