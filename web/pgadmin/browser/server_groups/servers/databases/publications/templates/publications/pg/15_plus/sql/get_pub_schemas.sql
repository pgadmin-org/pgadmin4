SELECT n.nspname AS sname
FROM pg_catalog.pg_publication_namespace pubnsp
JOIN pg_catalog.pg_namespace n ON pubnsp.pnnspid = n.oid
WHERE pnpubid = {{pbid}} :: oid;