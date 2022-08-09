SELECT
    rolname, rolcanlogin, rolsuper AS rolcatupdate, rolsuper
FROM
    pg_catalog.pg_roles
WHERE oid = {{ rid }}::OID
