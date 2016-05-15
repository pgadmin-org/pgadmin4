{% if attrelid  %}
SELECT
    a.attname, format_type(a.atttypid, NULL) AS datatype,
    quote_ident(n.nspname)||'.'||quote_ident(c.relname) as inheritedfrom,
    c.oid as inheritedid
FROM
    pg_class c
JOIN
    pg_namespace n ON c.relnamespace=n.oid
JOIN
    pg_attribute a ON a.attrelid = c.oid AND NOT a.attisdropped AND a.attnum>0
WHERE
    c.oid = {{attrelid}}::OID
{% endif %}
