SELECT
    oid, conname as name
FROM
    pg_constraint
WHERE
    conrelid = {{tid}}::oid
    AND conname={{ name|qtLiteral }};
