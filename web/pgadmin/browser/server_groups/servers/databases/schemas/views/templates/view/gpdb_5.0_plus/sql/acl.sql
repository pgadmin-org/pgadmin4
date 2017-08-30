{# ============================ Get ACLs ========================= #}
{% if vid %}
SELECT
    'datacl' as deftype,
    COALESCE(gt.rolname, 'PUBLIC') grantee,
    g.rolname grantor,
    array_agg(privilege_type) as privileges,
    array_agg(is_grantable) as grantable
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
            pg_class cl
        LEFT OUTER JOIN pg_shdescription descr ON (
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
                u_grantor.oid AS grantor,
                grantee.oid AS grantee,
                pr.type AS privilege_type,
                aclcontains(c.relacl, makeaclitem(grantee.oid, u_grantor.oid, pr.type, true)) AS is_grantable
            FROM pg_class c, pg_namespace nc, pg_authid u_grantor, (
                SELECT pg_authid.oid, pg_authid.rolname
                FROM pg_authid
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
            WHERE c.relnamespace = nc.oid
            AND (c.relkind = ANY (ARRAY['r'::"char", 'v'::"char"]))
            AND aclcontains(c.relacl, makeaclitem(grantee.oid, u_grantor.oid, pr.type, false))
            AND (pg_has_role(u_grantor.oid, 'USAGE'::text) OR pg_has_role(grantee.oid, 'USAGE'::text)
            OR grantee.rolname = 'PUBLIC'::name)
            AND c.oid = {{ vid }}
            ) d
        ) d
    ) d
    LEFT JOIN pg_catalog.pg_roles g ON (d.grantor = g.oid)
    LEFT JOIN pg_catalog.pg_roles gt ON (d.grantee = gt.oid)
GROUP BY
    g.rolname, gt.rolname
{% endif %}
