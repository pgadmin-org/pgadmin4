SELECT 'fdwacl' as deftype, COALESCE(gt.rolname, 'PUBLIC') grantee, g.rolname grantor, array_agg(privilege_type) as privileges, array_agg(is_grantable) as grantable
FROM
    (SELECT
        d.grantee, d.grantor, d.is_grantable,
        CASE d.privilege_type
        WHEN 'USAGE' THEN 'U'
        ELSE 'UNKNOWN'
        END AS privilege_type
    FROM
        (SELECT fdwacl FROM pg_foreign_data_wrapper fdw
            LEFT OUTER JOIN pg_shdescription descr ON (
            fdw.oid=descr.objoid AND descr.classoid='pg_foreign_data_wrapper'::regclass)
{% if fid %}
    WHERE fdw.oid = {{ fid|qtLiteral }}::OID
{% endif %}
        ) acl,
        aclexplode(fdwacl) d
        ) d
    LEFT JOIN pg_catalog.pg_roles g ON (d.grantor = g.oid)
    LEFT JOIN pg_catalog.pg_roles gt ON (d.grantee = gt.oid)
GROUP BY g.rolname, gt.rolname
