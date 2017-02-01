SELECT cl.oid as value, quote_ident(nspname)||'.'||quote_ident(relname) AS label
FROM pg_namespace nsp, pg_class cl
WHERE relnamespace=nsp.oid AND relkind='r'
   AND nsp.nspname NOT LIKE E'pg\_temp\_%'
   {% if not show_sysobj %}
   AND (nsp.nspname NOT LIKE E'pg\_%' AND nsp.nspname NOT in ('information_schema'))
   {% endif %}
ORDER BY nspname, relname