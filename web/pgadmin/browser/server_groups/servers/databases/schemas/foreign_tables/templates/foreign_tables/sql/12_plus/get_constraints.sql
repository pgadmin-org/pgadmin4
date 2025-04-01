SELECT
    oid as conoid, conname, contype,
    pg_catalog.BTRIM(substring(pg_catalog.pg_get_constraintdef(oid, true) from '\(.+\)'), '()') as consrc,
    connoinherit, convalidated, conislocal
FROM
    pg_catalog.pg_constraint
WHERE
    conrelid={{foid}}::oid
ORDER by conname;
