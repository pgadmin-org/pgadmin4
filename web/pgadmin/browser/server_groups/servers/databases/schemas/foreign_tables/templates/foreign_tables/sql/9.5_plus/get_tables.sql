{% import 'foreign_tables/sql/macros/db_catalogs.macro' as CATALOG %}
{% if attrelid  %}
SELECT
    array_agg(quote_ident(n.nspname) || '.' || quote_ident(c.relname)) as inherits
FROM
    pg_class c, pg_namespace n
WHERE
    c.relnamespace=n.oid AND c.relkind IN ('r', 'f')
    AND c.oid in {{attrelid}};

{% else %}
SELECT
    c.oid AS value, quote_ident(n.nspname) || '.' || quote_ident(c.relname) as label
FROM
    pg_class c, pg_namespace n
WHERE
    c.relnamespace=n.oid AND c.relkind IN ('r', 'f')
{% if not show_system_objects %}
{{ CATALOG.VALID_CATALOGS(server_type) }}
{% endif %}
{% if foid %}
    AND c.oid <> {{foid}}::oid
{% endif %}
ORDER BY
    n.nspname, c.relname;
{% endif %}
