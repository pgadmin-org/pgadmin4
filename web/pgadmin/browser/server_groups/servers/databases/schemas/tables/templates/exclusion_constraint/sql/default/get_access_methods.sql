SELECT amname
FROM pg_catalog.pg_am
WHERE EXISTS (SELECT 1
              FROM pg_catalog.pg_proc
              WHERE oid=amgettuple)
ORDER BY amname;
