SELECT ct.conindid AS oid,
    ct.conname AS name,
    NOT convalidated AS convalidated
FROM pg_catalog.pg_constraint ct
WHERE contype='x' AND
    conrelid = {{tid}}::oid
ORDER BY oid DESC LIMIT 1;
