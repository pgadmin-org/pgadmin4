SELECT nsp.oid
FROM pg_catalog.pg_namespace nsp
WHERE nspparent = {{scid}}::oid
AND nspname = {{ name|qtLiteral(conn) }}
AND nspobjecttype = 0;
