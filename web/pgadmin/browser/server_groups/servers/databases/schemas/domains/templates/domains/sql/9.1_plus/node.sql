SELECT
    d.oid, d.typname as name, pg_get_userbyid(d.typowner) as owner,
    bn.nspname as basensp
FROM
    pg_type d
JOIN
    pg_type b ON b.oid = d.typbasetype
JOIN
    pg_namespace bn ON bn.oid=d.typnamespace
WHERE
    d.typnamespace = {{scid}}::oid
ORDER BY
    d.typname;
