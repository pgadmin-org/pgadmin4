{% import 'tables/sql/macros/db_catalogs.macro' as CATALOG %}
SELECT c.oid, pg_catalog.quote_ident(n.nspname)||'.'||pg_catalog.quote_ident(c.relname) AS like_relation
FROM pg_catalog.pg_class c, pg_catalog.pg_namespace n
WHERE c.relnamespace=n.oid
    AND c.relkind IN ('r', 'v', 'f')
{% if not show_sys_objects %}
{{ CATALOG.VALID_CATALOGS(server_type) }}
{% endif %}
ORDER BY 1;
