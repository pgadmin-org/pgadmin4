SELECT
    rolname, rolcanlogin, rolsuper,
    -- Whether the connecting user may GRANT/REVOKE membership in this role.
    -- On PostgreSQL 14 and 15 the server's own check (AddRoleMems/DelRoleMems
    -- in user.c) is is_admin_of_role(), which walks pg_auth_members without
    -- regard to rolinherit, and pg_has_role(..., 'WITH ADMIN OPTION') calls
    -- exactly that function, so this matches the server's rule, including
    -- ADMIN OPTION held through another role the current user is a member of.
    pg_catalog.pg_has_role(
        current_user, {{ rid }}::OID, 'USAGE WITH ADMIN OPTION'
    ) AS has_admin_option
FROM
    pg_catalog.pg_roles
WHERE oid = {{ rid }}::OID
