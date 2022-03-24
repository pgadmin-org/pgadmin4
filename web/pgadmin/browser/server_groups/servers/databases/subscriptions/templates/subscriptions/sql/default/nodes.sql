SELECT oid, sub.subname AS name FROM pg_catalog.pg_subscription sub
WHERE
{% if subid %}
    sub.oid = {{ subid }};
{% else %}
    sub.subdbid = {{ did }}
{% endif %}
{% if schema_diff %}
    AND CASE WHEN (SELECT COUNT(*) FROM pg_catalog.pg_depend
        WHERE objid = oid AND deptype = 'e') > 0 THEN FALSE ELSE TRUE END
{% endif %}
