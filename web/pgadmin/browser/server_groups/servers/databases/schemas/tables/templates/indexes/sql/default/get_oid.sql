SELECT DISTINCT ON(cls.relname) cls.oid
FROM pg_catalog.pg_index idx
    JOIN pg_catalog.pg_class cls ON cls.oid=indexrelid
    JOIN pg_catalog.pg_class tab ON tab.oid=indrelid
    JOIN pg_catalog.pg_namespace n ON n.oid=tab.relnamespace
WHERE indrelid = {{tid}}::OID
    AND cls.relname = {{data.name|qtLiteral}};
