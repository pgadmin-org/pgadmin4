SELECT  proname AS name
FROM pg_proc
WHERE oid = {{edbfnid}}::oid
