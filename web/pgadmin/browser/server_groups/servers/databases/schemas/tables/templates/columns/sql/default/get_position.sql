SELECT att.attnum
FROM pg_attribute att
    WHERE att.attrelid = {{tid}}::oid
    AND att.attname = {{data.name|qtLiteral(True)}}
