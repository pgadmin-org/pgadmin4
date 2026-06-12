-- Fetches access methods
SELECT oid, amname
FROM pg_catalog.pg_am WHERE amtype = 't';