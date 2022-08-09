SELECT 'lanacl' as deftype, COALESCE(gt.rolname, 'PUBLIC') grantee, g.rolname grantor,
    pg_catalog.array_agg(privilege_type) as privileges, pg_catalog.array_agg(is_grantable) as grantable
FROM
    (SELECT
        d.grantee, d.grantor, d.is_grantable,
        CASE d.privilege_type
        WHEN 'USAGE' THEN 'U'
        ELSE 'UNKNOWN'
        END AS privilege_type
    FROM
        (SELECT lanacl FROM pg_catalog.pg_language lan
            LEFT OUTER JOIN pg_catalog.pg_shdescription descr ON (lan.oid=descr.objoid AND descr.classoid='pg_language'::regclass)
        WHERE lan.oid = {{ lid|qtLiteral }}::OID
        ) acl,
        pg_catalog.aclexplode(lanacl) d
    ) d
LEFT JOIN pg_catalog.pg_roles g ON (d.grantor = g.oid)
LEFT JOIN pg_catalog.pg_roles gt ON (d.grantee = gt.oid)
GROUP BY g.rolname, gt.rolname
ORDER BY grantee
