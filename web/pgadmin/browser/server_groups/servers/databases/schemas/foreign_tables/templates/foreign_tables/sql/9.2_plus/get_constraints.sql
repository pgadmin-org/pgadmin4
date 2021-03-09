SELECT
    conname, contype, consrc, conislocal
FROM
    pg_catalog.pg_constraint
WHERE
    conrelid={{foid}}::oid
ORDER by conname;
