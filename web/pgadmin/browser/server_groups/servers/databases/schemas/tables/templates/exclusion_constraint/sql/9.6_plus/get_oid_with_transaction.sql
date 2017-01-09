SELECT ct.conindid AS oid,
    ct.conname AS name,
    NOT convalidated AS convalidated
FROM pg_constraint ct
WHERE contype='x' AND
    conrelid = {{tid}}::oid LIMIT 1;