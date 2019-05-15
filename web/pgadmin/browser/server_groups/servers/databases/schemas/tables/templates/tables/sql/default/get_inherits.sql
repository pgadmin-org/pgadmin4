{% import 'tables/sql/macros/db_catalogs.macro' as CATALOG %}
SELECT c.oid, c.relname , nspname,
CASE WHEN nspname NOT LIKE 'pg\_%' THEN
 quote_ident(nspname)||'.'||quote_ident(c.relname)
ELSE quote_ident(c.relname)
END AS inherits
FROM pg_class c
JOIN pg_namespace n
ON n.oid=c.relnamespace
WHERE relkind='r'
{% if not show_system_objects %}
{{ CATALOG.VALID_CATALOGS(server_type) }}
{% endif %}
{% if tid %}
AND c.oid != tid
{% endif %}
AND c.relnamespace = {{ scid }}
ORDER BY relnamespace, c.relname
