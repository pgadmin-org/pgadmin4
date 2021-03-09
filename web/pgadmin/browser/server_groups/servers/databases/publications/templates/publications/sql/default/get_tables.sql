SELECT pg_catalog.quote_ident(pgb_table.schemaname)||'.'||pg_catalog.quote_ident(pgb_table.tablename)
AS pubtable  FROM pg_catalog.pg_publication_tables pgb_table WHERE pubname = '{{ pname }}'
AND pgb_table.schemaname NOT LIKE 'pgagent';
