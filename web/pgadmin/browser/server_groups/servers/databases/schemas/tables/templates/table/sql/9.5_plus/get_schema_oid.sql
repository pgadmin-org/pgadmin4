{# ===== fetch new assigned schema oid ===== #}
SELECT
    c.relnamespace as scid
FROM
    pg_class c
WHERE
{% if tid %}
    c.oid = {{tid}}::oid;
{% else %}
    c.relname = {{tname|qtLiteral}}::text;
{% endif %}
