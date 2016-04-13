{# ===== Fetch list of Database object types(Functions) ====== #}
{% if type and node_id and nspname %}
{% set func_type = 'Trigger Function' if type == 'trigger_function' else 'Function' %}
SELECT
    pr.oid,
    pg_get_function_identity_arguments(pr.oid) AS proargs,
    {# pr.proname || '(' || pg_get_function_identity_arguments(pr.oid) || ')' AS name,#}
    pr.proname AS name,
    '{{ nspname }}' AS nspname,
    '{{ func_type }}' AS object_type,
    '{{ "icon-function" if type != "trigger_function" else "icon-trigger_function" }}' AS icon
FROM
    pg_proc pr
JOIN pg_type typ ON typ.oid=prorettype
JOIN pg_namespace typns ON typns.oid=typ.typnamespace
JOIN pg_language lng ON lng.oid=prolang
LEFT OUTER JOIN pg_description des ON (des.objoid=pr.oid AND des.classoid='pg_proc'::regclass)
WHERE
    proisagg = FALSE AND pronamespace = {{ node_id }}::oid
    AND typname {{ 'NOT' if type != 'trigger_function' else '' }} IN ('trigger', 'event_trigger')
ORDER BY
    proname
{% endif %}
