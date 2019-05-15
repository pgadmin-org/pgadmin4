{% if scid and fnid %}
SELECT
    pr.proname as name, '(' || COALESCE(pg_catalog
    .pg_get_function_identity_arguments(pr.oid), '') || ')' as func_args,
    nspname
FROM
    pg_proc pr
JOIN
    pg_type typ ON typ.oid=prorettype
JOIN
    pg_namespace nsp ON nsp.oid=pr.pronamespace
WHERE
    pr.prokind IN ('f', 'w')
    AND pronamespace = {{scid}}::oid
    AND typname NOT IN ('trigger', 'event_trigger')
    AND pr.oid = {{fnid}};
{% endif %}

{% if name %}
DROP FUNCTION {{ conn|qtIdent(nspname, name) }}{{func_args}}{% if cascade %} CASCADE{% endif %};
{% endif %}

