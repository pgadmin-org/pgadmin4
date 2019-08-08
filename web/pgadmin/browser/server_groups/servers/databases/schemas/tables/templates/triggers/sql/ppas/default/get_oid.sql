SELECT t.oid
FROM pg_trigger t
    WHERE tgrelid = {{tid}}::OID
    AND tgname = {{data.name|qtLiteral}};