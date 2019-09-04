SELECT
    oid as conoid, conname, contype,
    BTRIM(substring(pg_get_constraintdef(oid, true) from '\(.+\)'), '()') as consrc,
    connoinherit, convalidated, conislocal
FROM
    pg_constraint
WHERE
    conrelid={{foid}}::oid
ORDER by conname;
