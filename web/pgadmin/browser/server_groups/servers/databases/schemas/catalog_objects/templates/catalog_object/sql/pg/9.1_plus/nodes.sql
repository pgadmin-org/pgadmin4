SELECT
    c.oid, c.relname as name
FROM
    pg_class c
WHERE relnamespace = {{scid}}::int
ORDER BY relname;
