SELECT ct.conindid AS oid,
    ct.conname AS name,
    true AS convalidated
FROM pg_catalog.pg_constraint ct
WHERE contype='x' AND
    conrelid = {{tid}}::oid LIMIT 1;
