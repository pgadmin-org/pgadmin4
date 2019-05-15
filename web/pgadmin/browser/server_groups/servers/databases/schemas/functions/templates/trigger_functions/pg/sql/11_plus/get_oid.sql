SELECT
    pr.oid, pr.proname || '(' || COALESCE(pg_catalog
    .pg_get_function_identity_arguments(pr.oid), '') || ')' as name,
    lanname, pg_get_userbyid(proowner) as funcowner, pr.pronamespace AS nsp
FROM
    pg_proc pr
JOIN
    pg_type typ ON typ.oid=prorettype
JOIN
    pg_language lng ON lng.oid=prolang
JOIN
    pg_namespace nsp ON nsp.oid=pr.pronamespace
    AND nsp.nspname={{ nspname|qtLiteral }}
WHERE
    pr.prokind IN ('f', 'w')
    AND typname IN ('trigger', 'event_trigger')
    AND lanname NOT IN ('edbspl', 'sql', 'internal')
    AND pr.proname = {{ name|qtLiteral }};
