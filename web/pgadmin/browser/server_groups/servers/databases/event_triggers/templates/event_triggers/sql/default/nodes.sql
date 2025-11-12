SELECT e.oid, e.evtname AS name,
    pg_catalog.obj_description(e.oid, 'pg_event_trigger') AS comment
FROM pg_catalog.pg_event_trigger e
{% if etid %}
WHERE e.oid={{etid}}::oid
{% endif %}
{% if schema_diff %}
WHERE CASE WHEN (SELECT COUNT(*) FROM pg_catalog.pg_depend
    WHERE objid = e.oid AND deptype = 'e') > 0 THEN FALSE ELSE TRUE END
{% endif %}
ORDER BY e.evtname
