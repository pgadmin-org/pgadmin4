SELECT
    oid as conoid, conname, contype, consrc, connoinherit, convalidated, conislocal
FROM
    pg_catalog.pg_constraint
WHERE
    conrelid={{foid}}::oid
ORDER by conname;
