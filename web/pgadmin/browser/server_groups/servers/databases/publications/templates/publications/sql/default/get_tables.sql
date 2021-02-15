SELECT quote_ident(pgb_table.schemaname)||'.'||quote_ident(pgb_table.tablename)
AS pubtable  FROM pg_publication_tables pgb_table WHERE pubname = '{{ pname }}'
AND pgb_table.schemaname NOT LIKE 'pgagent';
