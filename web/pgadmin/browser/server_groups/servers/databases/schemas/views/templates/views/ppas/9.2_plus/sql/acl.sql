{# ============================ Get ACLs ========================= #}
{% if vid %}
SELECT
    'datacl' as deftype,
    COALESCE(gt.rolname, 'PUBLIC') grantee,
    g.rolname grantor,
    pg_catalog.array_agg(privilege_type) as privileges,
    pg_catalog.array_agg(is_grantable) as grantable
FROM
    (SELECT
        d.grantee, d.grantor, d.is_grantable,
        CASE d.privilege_type
        WHEN 'DELETE' THEN 'd'
        WHEN 'INSERT' THEN 'a'
        WHEN 'REFERENCES' THEN 'x'
        WHEN 'SELECT' THEN 'r'
        WHEN 'TRIGGER' THEN 't'
        WHEN 'UPDATE' THEN 'w'
        WHEN 'TRUNCATE' THEN 'D'
        ELSE 'UNKNOWN'
        END AS privilege_type
    FROM
        (SELECT
            relacl
        FROM
            pg_catalog.pg_class cl
        LEFT OUTER JOIN pg_catalog.pg_shdescription descr ON (
            cl.oid=descr.objoid AND descr.classoid='pg_class'::regclass)
        WHERE
            cl.oid = {{ vid }}::OID AND relkind = 'v'
        ) acl,
        (SELECT
            (d).grantee AS grantee,
            (d).grantor AS grantor,
            (d).is_grantable AS is_grantable,
            (d).privilege_type AS privilege_type
        FROM
            (SELECT
                pg_catalog.aclexplode(relacl) AS d
             FROM
                pg_catalog.pg_class cl1
             WHERE
                cl1.oid = {{ vid }}
            ) a
        ) d
    ) d
LEFT JOIN pg_catalog.pg_roles g ON (d.grantor = g.oid)
LEFT JOIN pg_catalog.pg_roles gt ON (d.grantee = gt.oid)
GROUP BY
    g.rolname,
    gt.rolname
{% endif %}
