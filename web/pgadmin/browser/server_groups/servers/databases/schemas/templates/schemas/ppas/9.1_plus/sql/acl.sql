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
        (SELECT aclexplode(nsp.nspacl) as d
        FROM pg_namespace nsp
        WHERE nsp.oid = {{ scid|qtLiteral }}::OID
        ) a
    ) b
    LEFT JOIN pg_catalog.pg_roles g ON (b.grantor = g.oid)
    LEFT JOIN pg_catalog.pg_roles gt ON (b.grantee = gt.oid)
GROUP BY g.rolname, gt.rolname
ORDER BY grantee;
