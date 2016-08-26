{# Below will provide oid for newly created collation #}
{% if data %}
SELECT c.oid
FROM pg_collation c, pg_namespace n
WHERE c.collnamespace=n.oid AND
    n.nspname = {{ data.schema|qtLiteral }} AND
    c.collname = {{ data.name|qtLiteral }}
{% endif %}