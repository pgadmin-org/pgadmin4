SELECT
    rolname, rolcanlogin, rolsuper
FROM
    pg_catalog.pg_roles
WHERE oid = {{ rid }}::OID
