SELECT oid , pubname AS name
FROM pg_catalog.pg_publication
{% if schema_diff %}
WHERE CASE WHEN (SELECT COUNT(*) FROM pg_catalog.pg_depend
    WHERE objid = oid AND deptype = 'e') > 0 THEN FALSE ELSE TRUE END
{% endif %}
