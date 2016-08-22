SELECT  oid,
        varname AS name,
        format_type(vartype, NULL) as datatype,
        CASE
        WHEN varaccess = '+' THEN 'Public'
        WHEN varaccess = '-' THEN 'Private'
        ELSE 'Unknown' END AS visibility
FROM edb_variable
WHERE varpackage = {{pkgid}}::oid
{% if varid %}
AND oid = {{varid}}
{% endif %}
ORDER BY varname
