{# ======= Get the view's columns, for comparison with a new definition ======= #}
{% if vid %}
SELECT
    att.attname AS name,
    att.atttypid AS type_oid,
    att.atttypmod AS typmod,
    typ.typtype = 'd' AS is_domain,
    att.attcollation <> typ.typcollation AS has_collation
FROM
    pg_catalog.pg_attribute att
    JOIN pg_catalog.pg_type typ ON typ.oid = att.atttypid
WHERE
    att.attrelid = {{ vid }}::oid
    AND att.attnum > 0
    AND NOT att.attisdropped
ORDER BY
    att.attnum;
{% endif %}
