SELECT
  pg_catalog.quote_ident(c.table_schema)|| '.' || pg_catalog.quote_ident(c.table_name) AS table,
  (
    pg_catalog.quote_ident(c.table_schema)|| '.' || pg_catalog.quote_ident(c.table_name)
  ):: regclass :: oid as tid
FROM
  information_schema.tables c
WHERE
  c.table_type = 'BASE TABLE'
  AND c.table_schema NOT LIKE 'pg\_%'
  AND c.table_schema NOT LIKE 'pgagent'
  AND c.table_schema NOT LIKE 'sys'
  AND c.table_schema NOT IN ('information_schema')
ORDER BY
  1;