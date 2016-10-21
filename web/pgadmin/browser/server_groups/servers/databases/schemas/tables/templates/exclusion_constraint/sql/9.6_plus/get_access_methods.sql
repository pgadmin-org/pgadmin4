SELECT amname
FROM pg_am
WHERE EXISTS (SELECT 1
              FROM pg_proc
              WHERE oid=amhandler)
ORDER BY amname;