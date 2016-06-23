SELECT
    CASE (a.deftype)
    WHEN 'r' THEN 'deftblacl'
    WHEN 'S' THEN 'defseqacl'
    WHEN 'f' THEN 'deffuncacl'
    ELSE 'UNKNOWN - ' || a.deftype
    END AS deftype,
    COALESCE(gt.rolname, 'PUBLIC') grantee, g.rolname grantor, array_agg(a.privilege_type) as privileges, array_agg(a.is_grantable) as grantable
FROM
    (SELECT
        (acl).grantee as grantee, (acl).grantor AS grantor, (acl).is_grantable AS is_grantable,
        CASE (acl).privilege_type
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
        ELSE 'UNKNOWN - ' || (acl).privilege_type
        END AS privilege_type,
        defaclobjtype as deftype
    FROM
        (SELECT defaclobjtype, aclexplode(defaclacl) as acl
            FROM
                pg_namespace nsp
                LEFT OUTER JOIN pg_catalog.pg_default_acl dacl ON (dacl.defaclnamespace = nsp.oid)
            WHERE
                nsp.oid={{scid}}::int
        ) d) a
    LEFT JOIN pg_catalog.pg_roles g ON (a.grantor = g.oid)
    LEFT JOIN pg_catalog.pg_roles gt ON (a.grantee = gt.oid)
GROUP BY g.rolname, gt.rolname, a.deftype
ORDER BY a.deftype;
