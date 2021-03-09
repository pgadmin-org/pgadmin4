SELECT conname as name
FROM pg_catalog.pg_constraint ct
WHERE ct.conindid = {{cid}}::oid
