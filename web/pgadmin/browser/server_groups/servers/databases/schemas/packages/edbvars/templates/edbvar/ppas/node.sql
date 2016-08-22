SELECT  oid,
        varname AS name
FROM edb_variable
WHERE varpackage = {{pkgid}}::oid
ORDER BY varname
