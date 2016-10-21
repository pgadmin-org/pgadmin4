SELECT ct.oid,
    ct.conname as name,
    NOT convalidated as convalidated
FROM pg_constraint ct
WHERE contype='x' AND
    conrelid = {{tid}}::oid LIMIT 1;