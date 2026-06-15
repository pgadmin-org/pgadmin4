{# ===== Fetch list of Database object types(Functions) ====== #}
{% if type and node_id %}
{% set func_type = 'Trigger Function' if type == 'trigger_function' else 'Procedure' if type == 'procedure' else 'Function' %}
{% set icon = 'icon-function' if type == 'function' else 'icon-procedure' if type == 'procedure' else 'icon-trigger_function' %}
{% set kind = 'p' if type == 'procedure' else 'f' %}
SELECT
    pr.oid,
    pg_catalog.pg_get_function_identity_arguments(pr.oid) AS proargs,
    pr.proname AS name,
    nsp.nspname AS nspname,
    '{{ func_type }}' AS object_type,
    '{{ icon }}' AS icon
FROM
    pg_catalog.pg_proc pr
JOIN pg_catalog.pg_namespace nsp ON nsp.oid=pr.pronamespace
JOIN pg_catalog.pg_type typ ON typ.oid=prorettype
JOIN pg_catalog.pg_namespace typns ON typns.oid=typ.typnamespace
JOIN pg_catalog.pg_language lng ON lng.oid=prolang
LEFT OUTER JOIN pg_catalog.pg_description des ON (des.objoid=pr.oid AND des.classoid='pg_proc'::regclass)
WHERE
    pronamespace = {{ node_id }}::oid
    AND typname {{ 'NOT' if type != 'trigger_function' else '' }} IN ('trigger', 'event_trigger')
    AND pr.prokind = '{{ kind }}'
ORDER BY
    proname
{% endif %}
