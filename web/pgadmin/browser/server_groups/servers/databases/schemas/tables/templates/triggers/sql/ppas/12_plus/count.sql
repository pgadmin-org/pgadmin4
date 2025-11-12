SELECT COUNT(*)
FROM pg_catalog.pg_trigger t
    WHERE NOT tgisinternal
    AND tgrelid = {{tid}}::OID
    AND tgpackageoid = 0
