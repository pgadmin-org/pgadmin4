SELECT
    a.attname AS name, pg_catalog.format_type(a.atttypid, NULL) AS cltype,
    pg_catalog.pg_get_expr(def.adbin, def.adrelid) AS defval, a.attidentity as clidentity,
    pg_catalog.quote_ident(n.nspname)||'.'||pg_catalog.quote_ident(c.relname) as inheritedfrom,
    c.oid as inheritedid
FROM
    pg_catalog.pg_class c
JOIN
    pg_catalog.pg_namespace n ON c.relnamespace=n.oid
JOIN
    pg_catalog.pg_attribute a ON a.attrelid = c.oid AND NOT a.attisdropped AND a.attnum > 0
LEFT OUTER JOIN
    pg_catalog.pg_attrdef def ON adrelid=a.attrelid AND adnum=a.attnum
WHERE
{% if tid %}
    c.oid = {{tid}}::OID
{% else %}
    c.relname = {{tname|qtLiteral(conn)}}
{% endif %}
