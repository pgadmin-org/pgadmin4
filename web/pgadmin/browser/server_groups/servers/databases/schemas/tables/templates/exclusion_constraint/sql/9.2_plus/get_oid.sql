SELECT ct.conindid AS oid
FROM pg_constraint ct
WHERE contype='x' AND
ct.conname = {{ name|qtLiteral }};