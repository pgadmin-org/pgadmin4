SELECT
    conname, contype, consrc
FROM
    pg_constraint
WHERE
    conrelid={{foid}}::oid
ORDER by conname;
