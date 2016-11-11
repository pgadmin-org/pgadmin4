SELECT
	r.oid, r.*, r.rolsuper as rolcatupdate,
	pg_catalog.shobj_description(r.oid, 'pg_authid') AS description,
	ARRAY(
		SELECT
			CASE WHEN am.admin_option THEN '1' ELSE '0' END || rm.rolname
		FROM
			(SELECT * FROM pg_auth_members WHERE member = r.oid) am
			LEFT JOIN pg_catalog.pg_roles rm ON (rm.oid = am.roleid)
	) AS rolmembership,
	(SELECT array_agg(provider || '=' || label) FROM pg_shseclabel sl1 WHERE sl1.objoid=r.oid) AS seclabels
FROM
	pg_roles r
{% if rid %}
WHERE r.oid = {{ rid|qtLiteral }}::oid
{% endif %}
ORDER BY r.rolcanlogin, r.rolname
