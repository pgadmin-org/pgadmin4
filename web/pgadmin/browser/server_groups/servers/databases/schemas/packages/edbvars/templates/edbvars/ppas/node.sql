SELECT  oid,
        varname AS name
FROM edb_variable
WHERE varpackage = {{pkgid}}::oid
{% if varid %}
AND oid = {{ varid|qtLiteral }}
{% endif %}
ORDER BY varname
