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
    c.oid AS id, quote_ident(n.nspname) || '.' || quote_ident(c.relname) as text
FROM
    pg_class c, pg_namespace n
WHERE
    c.relnamespace=n.oid AND c.relkind IN ('r', 'f')
{% if foid %}
    AND c.oid <> {{foid}}::oid
{% endif %}
ORDER BY
    n.nspname, c.relname;
{% endif %}
