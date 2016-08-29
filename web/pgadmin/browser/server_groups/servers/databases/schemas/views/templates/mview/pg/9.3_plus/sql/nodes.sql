SELECT
    c.oid,
    c.relname AS name
FROM pg_class c
WHERE
  c.relkind = 'm'
{% if (vid and datlastsysoid) %}
    AND c.oid = {{vid}}::oid
{% elif scid %}
    AND c.relnamespace = {{scid}}::oid
ORDER BY
    c.relname
{% endif %}