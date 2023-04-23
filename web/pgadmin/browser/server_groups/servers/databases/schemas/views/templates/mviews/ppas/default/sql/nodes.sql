SELECT
    c.oid,
    c.relname AS name
FROM pg_catalog.pg_class c
WHERE
  c.relkind = 'm'
{% if (vid and datlastsysoid) %}
    AND c.oid = {{vid}}::oid
{% elif scid %}
    AND c.relnamespace = {{scid}}::oid
{% if schema_diff %}
    AND CASE WHEN (SELECT COUNT(*) FROM pg_catalog.pg_depend
        WHERE objid = c.oid AND deptype = 'e') > 0 THEN FALSE ELSE TRUE END
{% endif %}
ORDER BY
    c.relname
{% endif %}
