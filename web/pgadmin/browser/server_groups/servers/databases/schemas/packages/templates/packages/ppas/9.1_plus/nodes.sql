SELECT
    nsp.oid, nspname AS name
FROM
    pg_namespace nsp
WHERE nspparent = {{scid}}::oid
ORDER BY nspname;