SELECT conname as name
FROM pg_constraint ct
WHERE ct.conindid = {{cid}}::oid