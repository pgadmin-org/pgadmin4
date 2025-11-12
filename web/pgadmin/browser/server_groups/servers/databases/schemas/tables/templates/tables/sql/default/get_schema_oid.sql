{# ===== fetch new assigned schema oid ===== #}
SELECT
    c.relnamespace as scid, nsp.nspname as nspname
FROM
    pg_catalog.pg_class c
LEFT JOIN pg_catalog.pg_namespace nsp ON nsp.oid = c.relnamespace
WHERE
{% if tid %}
    c.oid = {{tid}}::oid;
{% else %}
    c.relname = {{tname|qtLiteral(conn)}}::text AND nspname = {{sname|qtLiteral(conn)}};
{% endif %}
