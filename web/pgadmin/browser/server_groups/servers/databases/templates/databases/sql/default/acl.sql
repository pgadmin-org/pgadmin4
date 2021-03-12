SELECT
    'datacl' AS deftype, COALESCE(gt.rolname, 'PUBLIC') AS grantee,
    g.rolname AS grantor, pg_catalog.array_agg(privilege_type) AS privileges,
    pg_catalog.array_agg(is_grantable) AS grantable
FROM
    (SELECT
        d.grantee,
        d.grantor,
        d.is_grantable,
        CASE d.privilege_type
        WHEN 'CONNECT' THEN 'c'
        WHEN 'CREATE' THEN 'C'
        WHEN 'DELETE' THEN 'd'
        WHEN 'EXECUTE' THEN 'X'
        WHEN 'INSERT' THEN 'a'
        WHEN 'REFERENCES' THEN 'x'
        WHEN 'SELECT' THEN 'r'
        WHEN 'TEMPORARY' THEN 'T'
        WHEN 'TRIGGER' THEN 't'
        WHEN 'TRUNCATE' THEN 'D'
        WHEN 'UPDATE' THEN 'w'
        WHEN 'USAGE' THEN 'U'
        ELSE 'UNKNOWN'
        END AS privilege_type
    FROM
        (SELECT
            u_grantor.oid AS grantor,
            grantee.oid AS grantee,
            pr.type AS privilege_type,
            pg_catalog.aclcontains(c.datacl, pg_catalog.makeaclitem(grantee.oid, u_grantor.oid, pr.type, true)) AS is_grantable
        FROM pg_catalog.pg_database c, pg_catalog.pg_authid u_grantor, (
            SELECT pg_catalog.pg_authid.oid, pg_catalog.pg_authid.rolname
            FROM pg_catalog.pg_authid
                UNION ALL
            SELECT 0::oid AS oid, 'PUBLIC') grantee(oid, rolname),
            (     SELECT 'SELECT'
                          UNION ALL
                  SELECT 'INSERT'
                          UNION ALL
                  SELECT 'UPDATE'
                          UNION ALL
                  SELECT 'DELETE'
                          UNION ALL
                  SELECT 'TRUNCATE'
                          UNION ALL
                  SELECT 'REFERENCES'
                          UNION ALL
                  SELECT 'TRIGGER') pr(type)
        WHERE pg_catalog.aclcontains(c.datacl, pg_catalog.makeaclitem(grantee.oid, u_grantor.oid, pr.type, false))
        AND (pg_catalog.pg_has_role(u_grantor.oid, 'USAGE'::text) OR pg_catalog.pg_has_role(grantee.oid, 'USAGE'::text)
        OR grantee.rolname = 'PUBLIC'::name)
        AND c.oid = {{ did|qtLiteral }}::OID
        ) d
    ) d
    LEFT JOIN pg_catalog.pg_roles g ON (d.grantor = g.oid)
    LEFT JOIN pg_catalog.pg_roles gt ON (d.grantee = gt.oid)
GROUP BY g.rolname, gt.rolname;


