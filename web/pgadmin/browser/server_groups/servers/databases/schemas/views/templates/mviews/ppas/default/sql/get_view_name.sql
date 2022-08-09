{# ===== get view name against view id ==== #}
{% if vid %}
SELECT
    c.relname AS name,
    nsp.nspname AS schema
FROM
    pg_catalog.pg_class c
    LEFT OUTER JOIN pg_catalog.pg_namespace nsp on nsp.oid = c.relnamespace
WHERE
    c.oid = {{vid}}
{% endif %}
