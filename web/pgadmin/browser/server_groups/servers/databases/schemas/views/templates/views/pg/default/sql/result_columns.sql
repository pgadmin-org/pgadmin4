{# ======= Get the view's columns, for comparison with a new definition ======= #}
{% if vid %}
SELECT
    att.attname AS name,
    att.atttypid AS type_oid,
    att.atttypmod AS typmod
FROM
    pg_catalog.pg_attribute att
WHERE
    att.attrelid = {{ vid }}::oid
    AND att.attnum > 0
    AND NOT att.attisdropped
ORDER BY
    att.attnum;
{% endif %}
