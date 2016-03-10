SELECT cl.oid as oid, relname as name
FROM pg_class cl
WHERE relkind = 'S' AND relnamespace = {{scid}}::oid
ORDER BY relname