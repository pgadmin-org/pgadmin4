SELECT t.oid, t.tgname as name, t.tgenabled AS is_enable_trigger
FROM pg_catalog.pg_trigger t

    WHERE NOT tgisinternal
    AND tgrelid = {{tid}}::OID
    AND tgpackageoid != 0
{% if trid %}
    AND t.oid = {{trid}}::OID
{% endif %}
    ORDER BY tgname;
