{% if not grant_reovke_sql %}
(SELECT
    CASE (a.deftype)
    WHEN 'r' THEN 'deftblacl'
    WHEN 'S' THEN 'defseqacl'
    WHEN 'f' THEN 'deffuncacl'
    WHEN 'T' THEN 'deftypeacl'
    END AS deftype,
	'defaultacls' as acltype,
    COALESCE(gt.rolname, 'PUBLIC') AS grantee, g.rolname AS grantor, pg_catalog.array_agg(a.privilege_type) as privileges, pg_catalog.array_agg(a.is_grantable) as grantable
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
        ELSE 'UNKNOWN'
        END AS privilege_type,
        defaclobjtype as deftype
    FROM
        (SELECT defaclobjtype, pg_catalog.aclexplode(defaclacl) as acl FROM pg_catalog.pg_default_acl dacl
      WHERE dacl.defaclnamespace = 0::OID) d) a
    LEFT JOIN pg_catalog.pg_roles g ON (a.grantor = g.oid)
    LEFT JOIN pg_catalog.pg_roles gt ON (a.grantee = gt.oid)
GROUP BY g.rolname, gt.rolname, a.deftype
ORDER BY a.deftype
	)
{% else %}
SELECT * from (
(SELECT
    CASE (e.deftype)
    WHEN 'r' THEN 'deftblacl'
    WHEN 'S' THEN 'defseqacl'
    WHEN 'f' THEN 'deffuncacl'
    WHEN 'T' THEN 'deftypeacl'
    END AS deftype,
   'revoke' as acltype,
    COALESCE(gt.rolname, 'PUBLIC') AS grantee, g.rolname AS grantor, pg_catalog.array_agg(e.privilege_type) as privileges, pg_catalog.array_agg(e.is_grantable) as grantable
FROM(
   SELECT
        (d.acl).grantee as grantee, (d.acl).grantor AS grantor, (d.acl).is_grantable AS is_grantable,
        CASE (d.acl).privilege_type
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
        END AS privilege_type,
        d.defaclobjtype as deftype
    FROM
     (select
         b.defaclobjtype,
         pg_catalog.aclexplode(b.revoke_priv) as acl
      from
         (select
            a.defaclobjtype,
            a.defaclrole,
            a.defaultprivileges,
            a.acldefault,
            array(select unnest(a.acldefault) except select unnest(a.defaultprivileges)) as revoke_priv
            from
               (SELECT
                  defaclobjtype,
                  defaclrole,
                  defaclacl as defaultprivileges,
                  CASE
                     WHEN defaclnamespace = 0 THEN acldefault(CASE WHEN defaclobjtype = 'S' THEN 's'::"char" ELSE defaclobjtype END, defaclrole)
                     ELSE '{}'
                  END AS acldefault
                 FROM pg_catalog.pg_default_acl dacl
                 WHERE dacl.defaclnamespace = 0::OID
               ) a
            ) b
         where not b.revoke_priv = '{}'
      ) d
   ) e
LEFT JOIN pg_catalog.pg_roles g ON (e.grantor = g.oid)
LEFT JOIN pg_catalog.pg_roles gt ON (e.grantee = gt.oid)
GROUP BY g.rolname, gt.rolname, e.deftype
ORDER BY e.deftype)

UNION
(
SELECT
    CASE (e.deftype)
    WHEN 'r' THEN 'deftblacl'
    WHEN 'S' THEN 'defseqacl'
    WHEN 'f' THEN 'deffuncacl'
    WHEN 'T' THEN 'deftypeacl'
    END AS deftype,
   'grant' as acltype,
    COALESCE(gt.rolname, 'PUBLIC') AS grantee, g.rolname AS grantor, pg_catalog.array_agg(e.privilege_type) as privileges, pg_catalog.array_agg(e.is_grantable) as grantable
FROM(
   SELECT
        (d.acl).grantee as grantee, (d.acl).grantor AS grantor, (d.acl).is_grantable AS is_grantable,
        CASE (d.acl).privilege_type
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
        END AS privilege_type,
        d.defaclobjtype as deftype
    FROM(
      select
         *,
         pg_catalog.aclexplode(b.grant_priv) as acl
      from
         (select
            a.defaclobjtype,
            a.defaclrole,
            a.defaultprivileges,
            a.acldefault,
            array(select unnest(a.defaultprivileges) except select unnest(a.acldefault)) as grant_priv
            from
               (SELECT
                  defaclobjtype,
                  defaclrole,
                  defaclacl as defaultprivileges,
                  CASE
                     WHEN defaclnamespace = 0
                     THEN acldefault(CASE WHEN defaclobjtype = 'S' THEN 's'::"char" ELSE defaclobjtype END, defaclrole)
                     ELSE '{}'
                  END AS acldefault
                 FROM pg_catalog.pg_default_acl dacl
                 WHERE dacl.defaclnamespace = 0::OID
               ) a
           ) b where not b.grant_priv = '{}'
      ) d
   ) e
LEFT JOIN pg_catalog.pg_roles g ON (e.grantor = g.oid)
   LEFT JOIN pg_catalog.pg_roles gt ON (e.grantee = gt.oid)
GROUP BY g.rolname, gt.rolname, e.deftype
ORDER BY e.deftype)) f order by f.acltype DESC
{% endif %}
