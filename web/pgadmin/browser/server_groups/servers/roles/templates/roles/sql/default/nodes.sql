SELECT
	r.oid, r.rolname, r.rolcanlogin, r.rolsuper
FROM
	pg_catalog.pg_roles r
{% if rid %}
WHERE r.oid = {{ rid|qtLiteral }}::oid
{% endif %}
ORDER BY r.rolcanlogin, r.rolname
