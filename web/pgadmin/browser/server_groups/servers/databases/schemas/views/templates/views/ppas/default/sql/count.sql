SELECT COUNT(*)
FROM pg_catalog.pg_class c
WHERE
  c.relkind = 'v'
{% if scid %}
    AND c.relnamespace = {{scid}}::oid
{% endif %}
