SELECT c.oid,
  quote_ident(n.nspname)||'.'||quote_ident(c.relname) AS typname
  FROM pg_namespace n, pg_class c
WHERE c.relkind = 'c' AND c.relnamespace=n.oid
  AND NOT (n.nspname like 'pg_%' OR n.nspname='information_schema')
ORDER BY typname;