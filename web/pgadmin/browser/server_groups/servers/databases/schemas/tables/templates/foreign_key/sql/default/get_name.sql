SELECT conname as name
FROM pg_constraint ct
WHERE ct.oid = {{fkid}}::oid