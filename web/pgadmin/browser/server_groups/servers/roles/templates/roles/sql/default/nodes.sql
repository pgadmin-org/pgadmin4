SELECT
	r.oid, r.rolname, r.rolcanlogin, r.rolsuper,
	pg_catalog.shobj_description(r.oid, 'pg_authid') AS description
FROM
	pg_catalog.pg_roles r
{% if rid %}
WHERE r.oid = {{ rid|qtLiteral(conn) }}::oid
{% endif %}
ORDER BY r.rolcanlogin, r.rolname
