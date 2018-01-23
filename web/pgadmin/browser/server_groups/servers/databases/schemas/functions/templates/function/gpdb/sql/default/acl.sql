SELECT
    COALESCE(gt.rolname, 'PUBLIC') AS grantee,
    g.rolname AS grantor, array_agg(privilege_type) AS privileges,
    array_agg(is_grantable) AS grantable
FROM
    (SELECT
            (d).grantee AS grantee,
            (d).grantor AS grantor,
            (d).is_grantable AS is_grantable,
            CASE (d).privilege_type
            WHEN 'EXECUTE' THEN 'X'
            ELSE 'UNKNOWN' END AS privilege_type
        FROM
            (SELECT
                u_grantor.oid AS grantor,
                grantee.oid AS grantee,
                pr.type AS privilege_type,
                aclcontains(c.proacl, makeaclitem(grantee.oid, u_grantor.oid, pr.type, true)) AS is_grantable
            FROM pg_proc c, pg_namespace nc, pg_authid u_grantor, (
                SELECT pg_authid.oid, pg_authid.rolname
                FROM pg_authid
                    UNION ALL
                SELECT 0::oid AS oid, 'PUBLIC') grantee(oid, rolname),
                (SELECT 'EXECUTE') pr(type)
            WHERE c.pronamespace = nc.oid
            AND (
              c.proacl is NULL
              OR aclcontains(c.proacl, makeaclitem(grantee.oid, u_grantor.oid, pr.type, false))
            )
            AND (pg_has_role(u_grantor.oid, 'USAGE'::text)
              OR pg_has_role(grantee.oid, 'USAGE'::text)
              OR grantee.rolname = 'PUBLIC'::name)
            AND c.oid = {{ fnid }}::OID
            ) d
        ) d
    LEFT JOIN pg_catalog.pg_roles g ON (d.grantor = g.oid)
    LEFT JOIN pg_catalog.pg_roles gt ON (d.grantee = gt.oid)
GROUP BY g.rolname, gt.rolname;
