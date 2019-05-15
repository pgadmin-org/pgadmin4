SELECT
    rolname, rolcanlogin, rolcatupdate, rolsuper
FROM
    pg_roles
WHERE oid = {{ rid }}::OID
