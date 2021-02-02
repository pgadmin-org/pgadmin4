SELECT rolname AS refname, refclassid, deptype
FROM pg_shdepend dep
LEFT JOIN pg_roles r ON refclassid=1260 AND refobjid=r.oid
{{where_clause}}
{% if db_name %}
 AND dep.dbid = (SELECT oid FROM pg_database WHERE datname = {{ db_name|qtLiteral }})
{% endif %}
ORDER BY 1
