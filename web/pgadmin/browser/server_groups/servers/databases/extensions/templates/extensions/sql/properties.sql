{#===================Fetch properties of each extension by name or oid===================#}
SELECT
    x.oid AS eid, pg_get_userbyid(extowner) AS owner,
    x.extname AS name, n.nspname AS schema,
    x.extrelocatable AS relocatable, x.extversion AS version,
    e.comment
FROM
    pg_extension x
    LEFT JOIN pg_namespace n ON x.extnamespace=n.oid
    JOIN pg_available_extensions() e(name, default_version, comment) ON x.extname=e.name
{%- if eid %}
 WHERE x.oid = {{eid}}::int
{% elif ename %}
 WHERE x.extname = {{ename|qtLiteral}}::text
{% else %}
 ORDER BY x.extname
{% endif %}
