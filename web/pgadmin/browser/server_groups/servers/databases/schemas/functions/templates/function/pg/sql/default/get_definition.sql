SELECT
    pg_get_functiondef({{fnid}}::oid) AS func_def,
    nspname || '.' || pr.proname || '(' || COALESCE(pg_catalog.pg_get_function_identity_arguments(pr.oid), '') || ')' as name,
    nspname || '.' || pr.proname || '(' || COALESCE(pg_catalog.pg_get_function_arguments(pr.oid), '') || ')' as name_with_default_args
FROM
    pg_proc pr
JOIN
    pg_namespace nsp ON nsp.oid=pr.pronamespace
WHERE
    proisagg = FALSE
    AND pronamespace = {{scid}}::oid
    AND pr.oid = {{fnid}}::oid;
