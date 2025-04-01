SELECT s.oid as syid, synnamespace as scid
    FROM pg_catalog.pg_synonym s
WHERE synname = {{ data.name|qtLiteral(conn) }}
AND synnamespace IN
    ( SELECT oid FROM pg_catalog.pg_namespace WHERE nspname = {{ data.schema|qtLiteral(conn) }} );
