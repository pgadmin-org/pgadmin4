SELECT
    pg_catalog.concat(pg_catalog.quote_ident(nsp.nspname),'.',pg_catalog.quote_ident(pr.proname)) AS proc_name,
    pr.pronargs AS number_of_arguments, proargnames,
    pg_catalog.oidvectortypes(proargtypes) AS proargtypenames,
	pg_catalog.pg_get_expr(proargdefaults, 'pg_catalog.pg_class'::regclass) AS proargdefaultvals
FROM
    pg_catalog.pg_proc pr
JOIN
    pg_catalog.pg_type typ ON typ.oid=prorettype
JOIN
    pg_catalog.pg_namespace nsp ON nsp.oid=pr.pronamespace
WHERE
    pr.prokind IN ('f', 'p')
    AND typname NOT IN ('trigger', 'event_trigger')
	AND (pronamespace = 2200::oid OR pronamespace > {{datlastsysoid}}::OID)
{% if without_args %}
    AND pr.pronargs = 0
{% endif %}
ORDER BY
    proname;
