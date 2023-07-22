SELECT COUNT(*)
FROM
    pg_catalog.pg_namespace nsp
WHERE nspparent = {{scid}}::oid
AND nspobjecttype = 0;
