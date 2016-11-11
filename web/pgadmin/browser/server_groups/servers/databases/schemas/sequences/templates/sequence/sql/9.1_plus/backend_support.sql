SELECT
    CASE WHEN nsp.nspname IN ('sys', 'dbo', 'information_schema') THEN true ELSE false END AS dbSupport
FROM pg_namespace nsp
WHERE nsp.oid={{scid}}::oid AND (
    (nspname = 'pg_catalog' AND EXISTS
        (SELECT 1 FROM pg_class WHERE relname = 'pg_class' AND relnamespace = nsp.oid LIMIT 1))
    OR (nspname = 'pgagent' AND EXISTS
	(SELECT 1 FROM pg_class WHERE relname = 'pga_job' AND relnamespace = nsp.oid LIMIT 1))
    OR (nspname = 'information_schema' AND EXISTS
	(SELECT 1 FROM pg_class WHERE relname = 'tables' AND relnamespace = nsp.oid LIMIT 1))
    OR (nspname LIKE '_%' AND EXISTS
	 (SELECT 1 FROM pg_proc WHERE proname='slonyversion' AND pronamespace = nsp.oid LIMIT 1))
    ) AND
    nspname NOT LIKE E'pg\\temp\\%' AND
    nspname NOT LIKE E'pg\\toast_temp\\%'