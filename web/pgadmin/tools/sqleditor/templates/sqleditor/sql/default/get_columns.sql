{# ============= Fetch the columns ============= #}
{% if obj_id %}
SELECT at.attname, ty.typname, at.attnum
    FROM pg_catalog.pg_attribute at
    LEFT JOIN pg_catalog.pg_type ty ON (ty.oid = at.atttypid)
WHERE attrelid={{obj_id}}::oid
    AND at.attnum > 0
    AND at.attisdropped = FALSE
{% endif %}
