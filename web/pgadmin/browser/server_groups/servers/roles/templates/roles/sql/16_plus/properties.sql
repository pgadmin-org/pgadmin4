SELECT
	r.oid, r.*,
	pg_catalog.shobj_description(r.oid, 'pg_authid') AS description,
	ARRAY(
		SELECT
			CASE WHEN am.admin_option THEN '1' ELSE '0' END
			|| CASE WHEN am.inherit_option THEN '1' ELSE '0' END
			|| CASE WHEN am.set_option THEN '1' ELSE '0' END
			|| rm.rolname
		FROM
			(SELECT * FROM pg_catalog.pg_auth_members WHERE member = r.oid) am
			LEFT JOIN pg_catalog.pg_roles rm ON (rm.oid = am.roleid)
		ORDER BY rm.rolname
	) AS rolmembership,
	(SELECT pg_catalog.array_agg(provider || '=' || label) FROM pg_catalog.pg_shseclabel sl1 WHERE sl1.objoid=r.oid) AS seclabels
	{% if rid %}
        ,ARRAY(
           SELECT
                CASE WHEN pg.admin_option THEN '1' ELSE '0' END
                || CASE WHEN pg.inherit_option THEN '1' ELSE '0' END
                || CASE WHEN pg.set_option THEN '1' ELSE '0' END
                || pg.usename
            FROM
                (SELECT pg_roles.rolname AS usename,
                     pg_auth_members.admin_option AS admin_option,
                     pg_auth_members.inherit_option AS inherit_option,
                     pg_auth_members.set_option AS set_option
                 FROM pg_roles
                JOIN pg_auth_members ON pg_roles.oid=pg_auth_members.member AND pg_auth_members.roleid={{ rid|qtLiteral(conn) }}::oid) pg
        ) rolmembers
    {% endif %}
FROM
	pg_catalog.pg_roles r
{% if rid %}
WHERE r.oid = {{ rid|qtLiteral(conn) }}::oid
{% endif %}
ORDER BY r.rolcanlogin, r.rolname
