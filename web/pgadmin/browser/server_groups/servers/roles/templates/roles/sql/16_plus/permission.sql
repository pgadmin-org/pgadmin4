SELECT
    rolname, rolcanlogin, rolsuper,
    -- Whether the connecting user may GRANT/REVOKE membership in this role.
    -- On PostgreSQL 16 and later the server's own check
    -- (check_role_membership_authorization and select_best_admin in user.c)
    -- is has_admin_privs_of_role(): ADMIN OPTION held directly, or through a
    -- chain of memberships each granted WITH INHERIT TRUE. pg_has_role(...,
    -- 'WITH ADMIN OPTION') still uses is_admin_of_role(), which ignores
    -- INHERIT and so says yes where the server answers "no possible
    -- grantors", hence the explicit walk over pg_auth_members here.
    (
        SELECT rolsuper FROM pg_catalog.pg_roles WHERE rolname = current_user
    ) OR EXISTS (
        WITH RECURSIVE admin_path(roleid, admin_option, inherit_option) AS (
            SELECT am.roleid, am.admin_option, am.inherit_option
            FROM pg_catalog.pg_auth_members am
            WHERE am.member = (
                SELECT oid FROM pg_catalog.pg_roles
                WHERE rolname = current_user
            )
            UNION
            SELECT am.roleid, am.admin_option, am.inherit_option
            FROM pg_catalog.pg_auth_members am
            JOIN admin_path p ON am.member = p.roleid
            WHERE p.inherit_option
        )
        SELECT 1 FROM admin_path
        WHERE roleid = {{ rid }}::OID AND admin_option
    ) AS has_admin_option
FROM
    pg_catalog.pg_roles
WHERE oid = {{ rid }}::OID
