SELECT e.oid, e.evtname AS name
FROM pg_event_trigger e
{% if etid %}
WHERE e.oid={{etid}}::oid
{% endif %}
ORDER BY e.evtname
