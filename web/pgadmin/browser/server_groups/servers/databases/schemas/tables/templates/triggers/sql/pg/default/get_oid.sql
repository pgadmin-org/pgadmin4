SELECT t.oid
FROM pg_catalog.pg_trigger t
    WHERE tgrelid = {{tid}}::OID
    AND tgname = {{data.name|qtLiteral}};
