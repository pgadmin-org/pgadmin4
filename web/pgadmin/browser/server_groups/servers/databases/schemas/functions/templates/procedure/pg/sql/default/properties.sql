SELECT
    pr.oid, pr.xmin, pr.*, pr.prosrc AS prosrc_c,
    pr.proname AS name, pg_get_function_result(pr.oid) AS prorettypename,
    typns.nspname AS typnsp, lanname, proargnames, oidvectortypes(proargtypes) AS proargtypenames,
    pg_get_expr(proargdefaults, 'pg_catalog.pg_class'::regclass) AS proargdefaultvals,
    pronargdefaults, proconfig, pg_get_userbyid(proowner) AS funcowner, description,
    (CASE WHEN
        pg_catalog.pg_get_function_identity_arguments(pr.oid) <> ''
    THEN
        pr.proname || '(' || pg_catalog.pg_get_function_identity_arguments(pr.oid) || ')'
    ELSE
        pr.proname
    END) AS name_with_args,
    (SELECT
        array_agg(provider || '=' || label)
    FROM
        pg_seclabel sl1
    WHERE
        sl1.objoid=pr.oid) AS seclabels
FROM
    pg_proc pr
JOIN
    pg_type typ ON typ.oid=prorettype
JOIN
    pg_namespace typns ON typns.oid=typ.typnamespace
JOIN
    pg_language lng ON lng.oid=prolang
LEFT OUTER JOIN
    pg_description des ON (des.objoid=pr.oid AND des.classoid='pg_proc'::regclass)
WHERE
    pr.prokind = 'p'
    AND typname NOT IN ('trigger', 'event_trigger')
{% if fnid %}
    AND pr.oid = {{fnid}}::oid
{% else %}
    AND pronamespace = {{scid}}::oid
{% endif %}
ORDER BY
    proname;
