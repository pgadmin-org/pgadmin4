SELECT
    pr.oid, pr.xmin,
    pr.prosrc, pr.prosrc AS prosrc_c, pr.pronamespace, pr.prolang, pr.procost, pr.prorows,
    pr.prosecdef, pr.proleakproof, pr.proisstrict, pr.proretset, pr.provolatile,
    pr.pronargs, pr.prorettype, pr.proallargtypes, pr.proargmodes, pr.probin, pr.proacl,
    pr.proname, pr.proname AS name, pg_get_function_result(pr.oid) AS prorettypename,
    typns.nspname AS typnsp, lanname, proargnames, oidvectortypes(proargtypes) AS proargtypenames,
    pg_get_expr(proargdefaults, 'pg_catalog.pg_class'::regclass) AS proargdefaultvals,
    pr.pronargdefaults, proconfig, pg_get_userbyid(proowner) AS funcowner, description,
    (
        WITH name_with_args_tab AS (SELECT pg_catalog.pg_get_function_identity_arguments(pr.oid) AS val)
        SELECT CASE WHEN
            val <> ''
        THEN
            pr.proname || '(' || val || ')'
        ELSE
            pr.proname::text
        END
        FROM name_with_args_tab
    ) AS name_with_args,
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
    pg_description des ON (des.objoid=pr.oid AND des.classoid='pg_proc'::regclass and des.objsubid = 0)
WHERE
    proisagg = FALSE
    AND typname NOT IN ('trigger', 'event_trigger')
{% if fnid %}
    AND pr.oid = {{fnid}}::oid
{% else %}
    AND pronamespace = {{scid}}::oid
{% endif %}
ORDER BY
    proname;
