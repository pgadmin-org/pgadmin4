SELECT
	r.oid, r.*,
	pg_catalog.shobj_description(r.oid, 'pg_authid') AS description,
	ARRAY(
		SELECT
			CASE WHEN am.admin_option THEN '1' ELSE '0' END || rm.rolname
		FROM
			(SELECT * FROM pg_catalog.pg_auth_members WHERE member = r.oid) am
			LEFT JOIN pg_catalog.pg_roles rm ON (rm.oid = am.roleid)
	) rolmembership,
	(SELECT pg_catalog.array_agg(provider || '=' || label) FROM pg_catalog.pg_shseclabel sl1 WHERE sl1.objoid=r.oid) AS seclabels
    {% if rid %}
        ,ARRAY(
           SELECT
				CASE WHEN pg.admin_option THEN '1' ELSE '0' END || pg.usename
			FROM
				(SELECT pg_roles.rolname AS usename, pg_auth_members.admin_option AS admin_option FROM pg_roles
				JOIN pg_auth_members ON pg_roles.oid=pg_auth_members.member AND pg_auth_members.roleid={{ rid|qtLiteral }}::oid) pg
        ) rolmembers
    {% endif %}
FROM
	pg_catalog.pg_roles r
{% if rid %}
WHERE r.oid = {{ rid|qtLiteral }}::oid
{% endif %}
ORDER BY r.rolcanlogin, r.rolname
