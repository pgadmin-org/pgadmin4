SELECT cl.oid as oid, relname as name, relnamespace as schema
FROM pg_catalog.pg_class cl
{% if show_internal %}
LEFT JOIN pg_catalog.pg_depend d1 ON d1.refobjid = cl.oid AND d1.deptype = 'i'
{% endif %}
WHERE
    relkind = 'S'
{% if scid %}
    AND relnamespace = {{scid|qtLiteral}}::oid
{% endif %}
{% if seid %}
    AND cl.oid = {{seid|qtLiteral}}::oid
{% endif %}
{% if schema_diff %}
    AND CASE WHEN (SELECT COUNT(*) FROM pg_catalog.pg_depend
        WHERE objid = cl.oid AND deptype = 'e') > 0 THEN FALSE ELSE TRUE END
{% endif %}
ORDER BY relname
