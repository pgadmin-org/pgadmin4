SELECT ct.oid,
    ct.conname as name,
    NOT convalidated as convalidated
FROM pg_catalog.pg_constraint ct
WHERE contype='f' AND
    conrelid = {{tid}}::oid LIMIT 1;
