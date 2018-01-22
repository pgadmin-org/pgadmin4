{# Fetch privileges for schema #}
SELECT
    'nspacl' as deftype, COALESCE(gt.rolname, 'PUBLIC') AS grantee,
    g.rolname AS grantor, array_agg(b.privilege_type) AS privileges,
    array_agg(b.is_grantable) AS grantable
FROM
    (SELECT
        (d).grantee AS grantee, (d).grantor AS grantor,
        (d).is_grantable AS is_grantable,
        CASE (d).privilege_type
        WHEN 'CREATE' THEN 'C'
        WHEN 'USAGE' THEN 'U'
        ELSE 'UNKNOWN - ' || (d).privilege_type
        END AS privilege_type
    FROM
        (
        SELECT
            u_grantor.oid AS grantor,
            grantee.oid AS grantee,
            pr.type AS privilege_type,
            aclcontains(nc.nspacl, makeaclitem(grantee.oid, u_grantor.oid, pr.type, true)) AS is_grantable
        FROM pg_namespace nc, pg_authid u_grantor, (
            SELECT pg_authid.oid, pg_authid.rolname
            FROM pg_authid
                UNION ALL
            SELECT 0::oid AS oid, 'PUBLIC') grantee(oid, rolname),
            (     SELECT 'CREATE'
                          UNION ALL
                  SELECT 'USAGE') pr(type)
        WHERE aclcontains(nc.nspacl, makeaclitem(grantee.oid, u_grantor.oid, pr.type, false))
        AND (pg_has_role(u_grantor.oid, 'USAGE'::text) OR pg_has_role(grantee.oid, 'USAGE'::text)
        OR grantee.rolname = 'PUBLIC'::name)
        AND nsp.oid = {{ scid|qtLiteral }}::OID
        ) a
    ) b
    LEFT JOIN pg_catalog.pg_roles g ON (b.grantor = g.oid)
    LEFT JOIN pg_catalog.pg_roles gt ON (b.grantee = gt.oid)
GROUP BY g.rolname, gt.rolname;
