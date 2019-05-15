{# ===== fetch new assigned schema id ===== #}
{% if vid %}
SELECT
    c.relnamespace as scid
FROM
    pg_class c
WHERE
    c.oid = {{vid}}::oid;
{% endif %}
