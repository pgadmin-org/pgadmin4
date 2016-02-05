SELECT
	r.oid, r.rolname, r.rolcanlogin, r.rolsuper
FROM
	{{ role_tbl }} r
{% if rid %}
WHERE r.oid = {{ rid }}::int
{% endif %}
ORDER BY r.rolcanlogin, r.rolname
