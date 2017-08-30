SELECT 'lanacl' as deftype, COALESCE(gt.rolname, 'PUBLIC') grantee, g.rolname grantor,
    array_agg(privilege_type) as privileges, array_agg(is_grantable) as grantable
FROM
    (SELECT
        d.grantee, d.grantor, d.is_grantable,
        CASE d.privilege_type
        WHEN 'USAGE' THEN 'U'
        ELSE 'UNKNOWN'
        END AS privilege_type
    FROM
        (SELECT lanacl FROM pg_language lan
            LEFT OUTER JOIN pg_shdescription descr ON (lan.oid=descr.objoid AND descr.classoid='pg_language'::regclass)
        WHERE lan.oid = {{ lid|qtLiteral }}::OID
        ) acl,
        (SELECT
            u_grantor.oid AS grantor,
            grantee.oid AS grantee,
            pr.type AS privilege_type,
            aclcontains(lan1.lanacl, makeaclitem(grantee.oid, u_grantor.oid, pr.type, true)) AS is_grantable
        FROM pg_language lan1, pg_authid u_grantor, (
            SELECT pg_authid.oid, pg_authid.rolname
            FROM pg_authid
                UNION ALL
            SELECT 0::oid AS oid, 'PUBLIC') grantee(oid, rolname),
            (SELECT 'USAGE') pr(type)
        WHERE aclcontains(lan1.lanacl, makeaclitem(grantee.oid, u_grantor.oid, pr.type, false))
        AND (pg_has_role(u_grantor.oid, 'USAGE'::text) OR pg_has_role(grantee.oid, 'USAGE'::text)
        OR grantee.rolname = 'PUBLIC'::name)
        AND lan1.oid = {{ lid|qtLiteral }}::OID
        ) d
    ) d
LEFT JOIN pg_catalog.pg_roles g ON (d.grantor = g.oid)
LEFT JOIN pg_catalog.pg_roles gt ON (d.grantee = gt.oid)
GROUP BY g.rolname, gt.rolname
