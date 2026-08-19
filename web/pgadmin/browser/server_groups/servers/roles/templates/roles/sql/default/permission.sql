SELECT
    rolname, rolcanlogin, rolsuper,
    EXISTS (
        SELECT 1 FROM pg_catalog.pg_auth_members am
        WHERE am.roleid = {{ rid }}::OID
          AND am.member = (
              SELECT oid FROM pg_catalog.pg_roles
              WHERE rolname = current_user
          )
          AND am.admin_option
    ) AS has_admin_option
FROM
    pg_catalog.pg_roles
WHERE oid = {{ rid }}::OID
