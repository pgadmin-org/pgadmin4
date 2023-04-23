SELECT rel.oid as tid
FROM pg_catalog.pg_class rel
WHERE rel.relkind IN ('r','s','t','p')
AND rel.relnamespace = {{ scid }}::oid
AND rel.relname = {{data.name|qtLiteral(conn)}}
