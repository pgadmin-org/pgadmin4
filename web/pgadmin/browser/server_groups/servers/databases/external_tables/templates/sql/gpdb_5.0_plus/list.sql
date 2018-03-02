SELECT pg_class.oid, relname as name
FROM pg_class
LEFT JOIN pg_namespace ON pg_namespace.oid=pg_class.relnamespace::oid
WHERE relkind = 'r'
 AND  relstorage = 'x'
 AND pg_namespace.nspname not like 'gp_toolkit';
