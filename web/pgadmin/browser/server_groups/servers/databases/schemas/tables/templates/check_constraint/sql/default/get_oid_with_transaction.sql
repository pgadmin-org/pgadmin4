SELECT ct.oid,
    ct.conname as name
FROM pg_catalog.pg_constraint ct
WHERE contype='c' AND
    conrelid = {{tid}}::oid LIMIT 1;
