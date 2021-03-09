{# =================== Drop/Cascade materialized view by name ====================#}
{% if vid %}
SELECT
    c.relname As name,
    nsp.nspname
FROM
    pg_catalog.pg_class c
LEFT JOIN pg_catalog.pg_namespace nsp ON c.relnamespace = nsp.oid
WHERE
    c.relfilenode = {{ vid }};
{% elif (name and nspname) %}
DROP MATERIALIZED VIEW {{ conn|qtIdent(nspname, name) }} {% if cascade %} CASCADE {% endif %};
{% endif %}
