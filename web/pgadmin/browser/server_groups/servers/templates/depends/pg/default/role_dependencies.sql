SELECT rolname AS refname, refclassid, deptype
FROM pg_catalog.pg_shdepend dep
LEFT JOIN pg_catalog.pg_roles r ON refclassid=1260 AND refobjid=r.oid
{{where_clause}}
{% if conn and conn.db %}
 AND dep.dbid = (SELECT oid FROM pg_catalog.pg_database WHERE datname = {{ conn.db|qtLiteral(conn) }})
{% endif %}
ORDER BY 1
