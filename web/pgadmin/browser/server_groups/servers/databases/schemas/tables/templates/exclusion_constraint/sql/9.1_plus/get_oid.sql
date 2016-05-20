SELECT ct.oid
FROM pg_constraint ct
WHERE contype='x' AND
ct.conname = {{ name|qtLiteral }};