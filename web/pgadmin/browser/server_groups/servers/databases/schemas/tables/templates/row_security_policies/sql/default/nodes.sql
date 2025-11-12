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
{% if schema_diff %}
    AND CASE WHEN (SELECT COUNT(*) FROM pg_catalog.pg_depend
        WHERE objid = pl.oid AND deptype = 'e') > 0 THEN FALSE ELSE TRUE END
{% endif %}
ORDER BY
    pl.polname;
