SELECT conindid as oid,
    conname as name,
    NOT convalidated as convalidated
FROM pg_constraint ct
WHERE contype='x' AND
    conrelid = {{tid}}::oid
ORDER BY conname