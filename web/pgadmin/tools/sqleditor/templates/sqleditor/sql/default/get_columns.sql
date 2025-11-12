SELECT at.attname, ty.typname, at.attnum
    FROM pg_catalog.pg_attribute at
    LEFT JOIN pg_catalog.pg_type ty ON (ty.oid = at.atttypid)
    JOIN pg_catalog.pg_class as cl ON cl.oid=at.attrelid
    JOIN pg_catalog.pg_namespace as nsp ON nsp.oid=cl.relnamespace
WHERE
{% if obj_id %}
    attrelid={{obj_id}}::oid AND
{% elif table_name and table_nspname %}
    cl.relname={{table_name|qtLiteral(conn)}} AND nsp.nspname={{table_nspname|qtLiteral(conn)}} AND
{% endif %}
at.attnum > 0
AND at.attisdropped = FALSE
