SELECT conindid as oid,
    conname as name,
    NOT convalidated as convalidated
FROM pg_catalog.pg_constraint ct
WHERE contype='x' AND
    conrelid = {{tid}}::oid
{% if exid %}
    AND conindid = {{exid}}::oid
{% endif %}
ORDER BY conname
