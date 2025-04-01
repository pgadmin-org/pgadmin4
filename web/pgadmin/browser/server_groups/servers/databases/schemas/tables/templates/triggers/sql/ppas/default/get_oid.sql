SELECT t.oid
FROM pg_catalog.pg_trigger t
    WHERE NOT tgisinternal
    AND tgrelid = {{tid}}::OID
    AND tgname = {{data.name|qtLiteral(conn)}};
