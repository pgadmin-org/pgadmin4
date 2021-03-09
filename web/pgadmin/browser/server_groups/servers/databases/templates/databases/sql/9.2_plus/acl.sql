SELECT
    'datacl' AS deftype, COALESCE(gt.rolname, 'PUBLIC') AS grantee,
    g.rolname grantor, pg_catalog.array_agg(privilege_type) AS privileges,
    pg_catalog.array_agg(is_grantable) AS grantable
FROM
    (SELECT
        d.grantee, d.grantor, d.is_grantable,
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
            (d).grantee AS grantee, (d).grantor AS grantor,
            (d).is_grantable AS is_grantable,
            (d).privilege_type AS privilege_type
        FROM
            (SELECT pg_catalog.aclexplode(db.datacl) AS d FROM pg_catalog.pg_database db
            WHERE db.oid = {{ did|qtLiteral }}::OID) a
        ) d
    ) d
    LEFT JOIN pg_catalog.pg_roles g ON (d.grantor = g.oid)
    LEFT JOIN pg_catalog.pg_roles gt ON (d.grantee = gt.oid)
GROUP BY g.rolname, gt.rolname;
