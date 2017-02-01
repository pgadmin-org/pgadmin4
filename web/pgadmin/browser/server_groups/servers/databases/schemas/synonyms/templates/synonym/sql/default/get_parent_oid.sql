SELECT synnamespace as scid
    FROM pg_synonym s
WHERE synname = {{ data.name|qtLiteral }}
AND synnamespace IN
    ( SELECT oid FROM pg_namespace WHERE nspname = {{ data.schema|qtLiteral }} );