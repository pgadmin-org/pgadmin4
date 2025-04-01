SELECT at.attname, at.attnum, ty.typname
FROM pg_catalog.pg_attribute at LEFT JOIN pg_catalog.pg_type ty ON (ty.oid = at.atttypid)
JOIN pg_catalog.pg_class as cl ON cl.oid=AT.attrelid
JOIN pg_catalog.pg_namespace as nsp ON nsp.oid=cl.relnamespace
WHERE
{% if obj_id %}
    attrelid={{obj_id}}::oid AND
{% elif table_name and table_nspname %}
    cl.relname = {{table_name|qtLiteral(conn)}} AND nsp.nspname={{table_nspname|qtLiteral(conn)}} AND
{% endif %}
attnum = ANY (
(SELECT con.conkey FROM pg_catalog.pg_class rel LEFT OUTER JOIN pg_catalog.pg_constraint con ON con.conrelid=rel.oid
JOIN pg_catalog.pg_namespace as nsp ON nsp.oid=REL.relnamespace
AND con.contype='p' WHERE rel.relkind IN ('r','s','t', 'p') AND
{% if obj_id %}
    rel.oid = ({{obj_id}})::oid
{% elif table_name and table_nspname%}
    rel.relname = {{table_name|qtLiteral(conn)}} AND nsp.nspname={{table_nspname|qtLiteral(conn)}}
{% endif %})::oid[])
