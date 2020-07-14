SELECT rolname AS refname, refclassid, deptype
FROM pg_shdepend dep
LEFT JOIN pg_roles r ON refclassid=1260 AND refobjid=r.oid
{{where_clause}} ORDER BY 1
