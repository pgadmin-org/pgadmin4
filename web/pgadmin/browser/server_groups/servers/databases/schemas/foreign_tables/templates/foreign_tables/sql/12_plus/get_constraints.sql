SELECT
    oid as conoid, conname, contype, pg_get_constraintdef(oid, true) as consrc,
    connoinherit, convalidated, conislocal
FROM
    pg_constraint
WHERE
    conrelid={{foid}}::oid
ORDER by conname;
