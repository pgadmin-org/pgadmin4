SELECT COUNT(*)
FROM pg_catalog.pg_collation c
{% if scid %}
WHERE c.collnamespace = {{scid}}::oid
{% endif %}
