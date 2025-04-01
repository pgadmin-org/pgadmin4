SELECT COUNT(*)
FROM pg_catalog.pg_class c
WHERE
  c.relkind = 'm'
{% if scid %}
    AND c.relnamespace = {{scid}}::oid
{% endif %}
