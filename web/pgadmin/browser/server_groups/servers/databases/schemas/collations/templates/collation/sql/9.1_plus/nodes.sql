SELECT c.oid, c.collname AS name
FROM pg_collation c
WHERE c.collnamespace = {{scid}}::oid
ORDER BY c.collname;
