SELECT pg_class.oid, relname as name
FROM pg_class
WHERE relkind = 'r'
 AND  relstorage = 'x'
 AND pg_class.oid = {{ external_table_id }}::oid;
