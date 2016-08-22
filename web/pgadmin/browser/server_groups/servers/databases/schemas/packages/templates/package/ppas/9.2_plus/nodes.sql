SELECT nsp.oid, nspname AS name
FROM pg_namespace nsp
WHERE nspparent = {{scid}}::oid
AND nspobjecttype = 0
ORDER BY nspname;