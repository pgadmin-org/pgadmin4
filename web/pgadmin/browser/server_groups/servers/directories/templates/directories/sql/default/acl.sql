{### SQL to fetch privileges for directories ###}
SELECT 'diracl' AS deftype, 
       COALESCE(grantee.rolname, 'PUBLIC') AS grantee, 
       grantor.rolname AS grantor,
       ARRAY_AGG(privilege_type) AS privileges, 
       ARRAY_AGG(is_grantable) AS grantable
FROM (
    SELECT
        acl.grantee, acl.grantor, acl.is_grantable,
        CASE acl.privilege_type
            WHEN 'SELECT' THEN 'R'
            WHEN 'UPDATE' THEN 'W'
            ELSE 'UNKNOWN'
        END AS privilege_type
    FROM (
        SELECT (d).grantee AS grantee, 
               (d).grantor AS grantor, 
               (d).is_grantable AS is_grantable, 
               (d).privilege_type AS privilege_type
        FROM (
            SELECT pg_catalog.aclexplode(ed.diracl) AS d 
            FROM pg_catalog.edb_dir ed
            {% if dr_id %}
            WHERE ed.oid = {{ dr_id|qtLiteral(conn) }}::OID
            {% endif %}
        ) acl_exploded
    ) acl
) acl_final
LEFT JOIN pg_catalog.pg_roles grantor ON (acl_final.grantor = grantor.oid)
LEFT JOIN pg_catalog.pg_roles grantee ON (acl_final.grantee = grantee.oid)
GROUP BY grantor.rolname, grantee.rolname
ORDER BY grantee;