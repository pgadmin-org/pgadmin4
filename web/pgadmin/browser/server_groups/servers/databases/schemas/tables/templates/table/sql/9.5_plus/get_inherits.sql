SELECT c.oid, c.relname , nspname,
CASE WHEN nspname NOT LIKE E'pg\_%' THEN
 quote_ident(nspname)||'.'||quote_ident(c.relname)
ELSE quote_ident(c.relname)
END AS inherits
FROM pg_class c
JOIN pg_namespace n
ON n.oid=c.relnamespace
WHERE relkind='r'
{% if not show_system_objects %}
AND (n.nspname NOT LIKE E'pg\_%' AND n.nspname NOT in ('information_schema'))
{% endif %}
{% if tid %}
AND c.oid != tid
{% endif %}
ORDER BY relnamespace, c.relname