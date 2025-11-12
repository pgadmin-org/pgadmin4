SELECT COUNT(*)
FROM
    pg_catalog.pg_proc pr
JOIN
    pg_catalog.pg_type typ ON typ.oid=prorettype
WHERE
    pr.prokind IN ('f', 'w')
    AND typname NOT IN ('trigger', 'event_trigger')
    AND pronamespace = {{scid}}::oid;
