SELECT
	r.oid, r.rolname, r.rolcanlogin, r.rolsuper
FROM
	pg_roles r
{% if rid %}
WHERE r.oid = {{ rid|qtLiteral }}::int
{% endif %}
ORDER BY r.rolcanlogin, r.rolname
