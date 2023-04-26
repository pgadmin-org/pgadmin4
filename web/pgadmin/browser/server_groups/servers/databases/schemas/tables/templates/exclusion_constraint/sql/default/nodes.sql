SELECT conindid as oid,
    conname as name,
    NOT convalidated as convalidated,
    desp.description AS comment
FROM pg_catalog.pg_constraint ct
LEFT OUTER JOIN pg_catalog.pg_description desp ON (desp.objoid=ct.oid AND desp.objsubid = 0 AND desp.classoid='pg_constraint'::regclass)
WHERE contype='x' AND
    conrelid = {{tid}}::oid
{% if exid %}
    AND conindid = {{exid}}::oid
{% endif %}
ORDER BY conname
