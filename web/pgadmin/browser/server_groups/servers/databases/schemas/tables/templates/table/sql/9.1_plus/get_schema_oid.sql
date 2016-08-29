{# ===== fetch new assigned schema oid ===== #}
{% if tid %}
SELECT
    c.relnamespace as scid
FROM
    pg_class c
WHERE
    c.oid = {{tid}}::oid;
{% endif %}
