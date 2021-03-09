SELECT 'fdwacl' as deftype, COALESCE(gt.rolname, 'PUBLIC') grantee, g.rolname grantor, pg_catalog.array_agg(privilege_type) as privileges, pg_catalog.array_agg(is_grantable) as grantable
FROM
    (SELECT
        d.grantee, d.grantor, d.is_grantable,
        CASE d.privilege_type
        WHEN 'USAGE' THEN 'U'
        ELSE 'UNKNOWN'
        END AS privilege_type
    FROM
        (SELECT fdwacl FROM pg_catalog.pg_foreign_data_wrapper fdw
            LEFT OUTER JOIN pg_catalog.pg_shdescription descr ON (
            fdw.oid=descr.objoid AND descr.classoid='pg_foreign_data_wrapper'::regclass)
{% if fid %}
    WHERE fdw.oid = {{ fid|qtLiteral }}::OID
{% endif %}
        ) acl,
            (SELECT (d).grantee AS grantee, (d).grantor AS grantor, (d).is_grantable AS is_grantable,
                    (d).privilege_type AS privilege_type
            FROM (SELECT pg_catalog.aclexplode(fdwacl) as d FROM pg_catalog.pg_foreign_data_wrapper fdw1
            {% if fid %}
                    WHERE fdw1.oid = {{ fid|qtLiteral }}::OID ) a
            {% endif %}
            ) d
    ) d
    LEFT JOIN pg_catalog.pg_roles g ON (d.grantor = g.oid)
    LEFT JOIN pg_catalog.pg_roles gt ON (d.grantee = gt.oid)
GROUP BY g.rolname, gt.rolname
ORDER BY grantee
