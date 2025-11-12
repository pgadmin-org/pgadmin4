SELECT COUNT(*)
FROM
    pg_catalog.pg_proc pr
JOIN
    pg_catalog.pg_type typ ON typ.oid=prorettype
JOIN
    pg_catalog.pg_namespace typns ON typns.oid=typ.typnamespace
JOIN
    pg_catalog.pg_language lng ON lng.oid=prolang
WHERE
    proisagg = FALSE
    AND typname IN ('trigger', 'event_trigger')
    AND lanname NOT IN ('sql', 'internal')
    AND pronamespace = {{scid}}::oid;
