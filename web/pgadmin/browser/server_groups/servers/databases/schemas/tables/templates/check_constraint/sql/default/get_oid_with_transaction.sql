SELECT ct.oid,
    ct.conname as name,
    NOT convalidated as convalidated
FROM pg_catalog.pg_constraint ct
WHERE contype='c' AND
    conrelid = {{tid}}::oid
ORDER BY ct.oid DESC LIMIT 1;
