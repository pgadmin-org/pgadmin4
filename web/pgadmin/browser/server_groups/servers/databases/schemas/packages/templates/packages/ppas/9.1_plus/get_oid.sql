SELECT nsp.oid
FROM pg_namespace nsp
WHERE nspparent = {{scid}}::oid
AND nspname = {{ name|qtLiteral }};