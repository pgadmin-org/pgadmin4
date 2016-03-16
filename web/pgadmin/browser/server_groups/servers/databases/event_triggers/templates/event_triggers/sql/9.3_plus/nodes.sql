SELECT e.oid, e.evtname AS name
FROM pg_event_trigger e
ORDER BY e.evtname
