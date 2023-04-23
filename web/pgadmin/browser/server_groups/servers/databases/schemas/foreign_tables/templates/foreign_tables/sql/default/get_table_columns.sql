{% if attrelid  %}
SELECT
    a.attname, pg_catalog.format_type(a.atttypid, NULL) AS datatype,
    pg_catalog.quote_ident(n.nspname)||'.'||quote_ident(c.relname) as inheritedfrom,
    c.oid as inheritedid
FROM
    pg_catalog.pg_class c
JOIN
    pg_catalog.pg_namespace n ON c.relnamespace=n.oid
JOIN
    pg_catalog.pg_attribute a ON a.attrelid = c.oid AND NOT a.attisdropped AND a.attnum>0
WHERE
    c.oid = {{attrelid}}::OID
{% endif %}
