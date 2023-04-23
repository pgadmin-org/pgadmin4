SELECT t.oid, t.tgname as name, t.tgenabled AS is_enable_trigger
FROM pg_catalog.pg_trigger t

    WHERE NOT tgisinternal
    AND tgrelid = {{tid}}::OID
    AND tgpackageoid != 0
{% if trid %}
    AND t.oid = {{trid}}::OID
{% endif %}
{% if schema_diff %}
    AND CASE WHEN (SELECT COUNT(*) FROM pg_catalog.pg_depend
        WHERE objid = t.oid AND deptype = 'e') > 0 THEN FALSE ELSE TRUE END
{% endif %}
    ORDER BY tgname;
