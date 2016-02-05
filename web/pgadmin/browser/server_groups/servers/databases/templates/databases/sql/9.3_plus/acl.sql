SELECT 'datacl' AS deftype, COALESCE(gt.rolname, 'public') AS grantee, g.rolname AS grantor, array_agg(privilege_type) AS privileges, array_agg(is_grantable) AS grantable
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
		(SELECT datacl FROM pg_database db
		    LEFT OUTER JOIN pg_tablespace ta ON db.dattablespace=ta.OID
		    LEFT OUTER JOIN pg_shdescription descr ON (
          db.oid=descr.objoid AND descr.classoid='pg_database'::regclass)
{% if did %}
  WHERE db.oid = {{ did|qtLiteral }}::OID
{% endif %}
		) acl,
		aclexplode(datacl) d
		) d
	LEFT JOIN pg_catalog.pg_roles g ON (d.grantor = g.oid)
	LEFT JOIN pg_catalog.pg_roles gt ON (d.grantee = gt.oid)
GROUP BY g.rolname, gt.rolname
