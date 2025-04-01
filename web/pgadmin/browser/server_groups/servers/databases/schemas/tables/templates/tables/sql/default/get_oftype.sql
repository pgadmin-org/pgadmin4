{% import 'tables/sql/macros/db_catalogs.macro' as CATALOG %}
SELECT c.oid,
  pg_catalog.quote_ident(n.nspname)||'.'||pg_catalog.quote_ident(c.relname) AS typname
  FROM pg_catalog.pg_namespace n, pg_catalog.pg_class c
WHERE c.relkind = 'c' AND c.relnamespace=n.oid
{% if not show_system_objects %}
{{ CATALOG.VALID_CATALOGS(server_type) }}
{% endif %}
ORDER BY typname;
