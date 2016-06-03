SELECT c.oid, quote_ident(n.nspname)||'.'||quote_ident(c.relname) AS like_relation
FROM pg_class c, pg_namespace n
WHERE c.relnamespace=n.oid
    AND c.relkind IN ('r', 'v', 'f')
{% if not show_sys_objects %}
    AND n.nspname NOT LIKE E'pg\\_%'
    AND n.nspname NOT in ('information_schema', 'sys')
{% endif %}
ORDER BY 1;