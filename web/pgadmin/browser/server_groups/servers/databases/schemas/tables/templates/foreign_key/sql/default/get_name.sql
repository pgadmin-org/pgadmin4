SELECT conname as name
FROM pg_catalog.pg_constraint ct
WHERE ct.oid = {{fkid}}::oid
