SELECT ct.conindid as oid,
    ct.conname as name
FROM pg_catalog.pg_constraint ct
WHERE contype='{{constraint_type}}' AND
    conrelid = {{tid}}::oid
ORDER BY oid DESC LIMIT 1;
