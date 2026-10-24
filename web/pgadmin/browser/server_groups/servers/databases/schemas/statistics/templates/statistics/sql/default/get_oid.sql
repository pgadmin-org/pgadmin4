{### Get the OID and name of a newly created statistics object ###}
{### From PostgreSQL 16 the name is optional, so when we do not have one ###}
{### the newest object on the table is the one that was just created ###}
SELECT s.oid, s.stxname AS name
FROM pg_catalog.pg_statistic_ext s
    JOIN pg_catalog.pg_namespace ns ON ns.oid = s.stxnamespace
    JOIN pg_catalog.pg_class t ON t.oid = s.stxrelid
    JOIN pg_catalog.pg_namespace tn ON tn.oid = t.relnamespace
WHERE ns.nspname = {{schema|qtLiteral(conn)}}
{% if name %}
    AND s.stxname = {{name|qtLiteral(conn)}}
{% else %}
    AND tn.nspname = {{(table_schema or schema)|qtLiteral(conn)}}
    AND t.relname = {{table|qtLiteral(conn)}}
{% endif %}
ORDER BY s.oid DESC LIMIT 1
