SELECT t.oid,
  quote_ident(n.nspname)||'.'||quote_ident(t.typname) AS typname
  FROM pg_type t, pg_namespace n
WHERE t.typtype='c' AND t.typnamespace=n.oid
  AND NOT (n.nspname like 'pg_%' OR n.nspname='information_schema')
ORDER BY typname;