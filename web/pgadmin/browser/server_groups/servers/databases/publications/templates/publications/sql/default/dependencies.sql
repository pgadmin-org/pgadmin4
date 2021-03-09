SELECT cl.oid AS oid,
pg_catalog.quote_ident(pgb_table.schemaname)||'.'||pg_catalog.quote_ident(pgb_table.tablename) AS pubtable
FROM pg_catalog.pg_publication_tables pgb_table
LEFT JOIN pg_catalog.pg_class cl ON pgb_table.tablename = cl.relname
WHERE pubname = '{{ pname }}' AND pgb_table.schemaname NOT LIKE 'pgagent';
