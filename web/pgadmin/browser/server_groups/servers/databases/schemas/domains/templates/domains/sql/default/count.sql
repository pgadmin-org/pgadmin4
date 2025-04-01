SELECT COUNT(*)
FROM
    pg_catalog.pg_type d
JOIN
    pg_catalog.pg_type b ON b.oid = d.typbasetype
JOIN
    pg_catalog.pg_namespace bn ON bn.oid=d.typnamespace
WHERE
    d.typnamespace = {{scid}}::oid
