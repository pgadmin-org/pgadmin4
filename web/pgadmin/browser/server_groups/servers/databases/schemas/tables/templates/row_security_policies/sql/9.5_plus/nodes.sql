SELECT
    pl.oid AS oid,
    pl.polname AS name
FROM
    pg_catalog.pg_policy pl
WHERE
{% if tid %}
    pl.polrelid	 = {{ tid }}
{% elif plid %}
    pl.oid = {{ plid }}
{% endif %}
ORDER BY
    pl.polname;
