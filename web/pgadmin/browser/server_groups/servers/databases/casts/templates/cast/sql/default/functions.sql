{# FETCH FUNCTIONS depending upon SOURCE TYPE and TARGET TYPE IN CAST  #}
SELECT
    proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')' as proname,
    nspname,
    proargtypes
FROM
    pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE
    proargtypes[0] = (SELECT t.oid FROM pg_type t WHERE format_type(t.oid, NULL) = {{srctyp|qtLiteral}})
    AND prorettype = (SELECT t.oid FROM pg_type t WHERE format_type(t.oid, NULL) = {{trgtyp|qtLiteral}})
    AND CASE
        WHEN array_length(proargtypes,1)  = 2 THEN
            proargtypes[1] = 23
        WHEN array_length(proargtypes,1)  >= 3 THEN
            proargtypes[1] = 23 AND proargtypes[2] = 16
       ELSE TRUE
    END
