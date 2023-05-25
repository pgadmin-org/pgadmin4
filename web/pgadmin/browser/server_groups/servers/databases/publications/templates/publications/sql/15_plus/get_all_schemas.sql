select nspname from pg_catalog.pg_namespace c WHERE
  c.nspname NOT LIKE 'pg\_%'
  AND c.nspname NOT IN ('information_schema')
ORDER BY
  1;
