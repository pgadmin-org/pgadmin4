SELECT cl.oid AS oid,
quote_ident(pgb_table.schemaname)||'.'||quote_ident(pgb_table.tablename) AS pubtable
FROM pg_publication_tables pgb_table
LEFT JOIN pg_class cl ON pgb_table.tablename = cl.relname
WHERE pubname = '{{ pname }}' AND pgb_table.schemaname NOT LIKE 'pgagent';
