{# ===== fetch new assigned schema oid ===== #}
SELECT
    c.relnamespace as scid, nsp.nspname as nspname
FROM
    pg_class c
LEFT JOIN pg_namespace nsp ON nsp.oid = c.relnamespace
WHERE
{% if tid %}
    c.oid = {{tid}}::oid;
{% else %}
    c.relname = {{tname|qtLiteral}}::text;
{% endif %}
