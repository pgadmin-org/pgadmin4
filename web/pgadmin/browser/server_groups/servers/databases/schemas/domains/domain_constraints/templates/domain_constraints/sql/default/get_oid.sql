SELECT
    oid, conname as name
FROM
    pg_constraint
WHERE
    contypid = {{doid}}::oid
    AND conname={{ name|qtLiteral }};
