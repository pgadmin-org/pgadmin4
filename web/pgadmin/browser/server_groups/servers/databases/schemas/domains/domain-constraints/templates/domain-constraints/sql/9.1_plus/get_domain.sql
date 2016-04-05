SELECT
    d.typname as domain, bn.nspname as schema
FROM
    pg_type d
JOIN
    pg_namespace bn ON bn.oid=d.typnamespace
WHERE
    d.oid = {{doid}};
