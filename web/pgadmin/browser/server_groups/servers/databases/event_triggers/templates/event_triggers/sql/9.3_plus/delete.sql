{% if etid %}
SELECT e.evtname AS name FROM pg_event_trigger e
WHERE e.oid={{etid}}::oid;
{% endif %}
{% if name %}
DROP EVENT TRIGGER IF EXISTS {{ conn|qtIdent(name) }}{% if cascade%} CASCADE{% endif %};
{% endif %}