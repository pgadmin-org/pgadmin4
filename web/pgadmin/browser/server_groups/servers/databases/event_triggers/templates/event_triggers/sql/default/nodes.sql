SELECT e.oid, e.evtname AS name
FROM pg_catalog.pg_event_trigger e
{% if etid %}
WHERE e.oid={{etid}}::oid
{% endif %}
{% if schema_diff %}
WHERE CASE WHEN (SELECT COUNT(*) FROM pg_catalog.pg_depend
    WHERE objid = e.oid AND deptype = 'e') > 0 THEN FALSE ELSE TRUE END
{% endif %}
ORDER BY e.evtname
