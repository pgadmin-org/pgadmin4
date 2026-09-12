{### SQL to drop extended statistics object ###}
{% if stid %}
SELECT
    s.stxname AS name,
    ns.nspname AS schema
FROM pg_catalog.pg_statistic_ext s
    LEFT JOIN pg_catalog.pg_namespace ns ON ns.oid = s.stxnamespace
WHERE s.oid = {{stid}}::oid;
{% endif %}
{% if name %}
DROP STATISTICS{% if cascade %} CASCADE{% endif %} {{ conn|qtIdent(schema, name) }};
{% endif %}
