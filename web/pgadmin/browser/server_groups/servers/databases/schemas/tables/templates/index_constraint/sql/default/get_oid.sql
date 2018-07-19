SELECT ct.conindid as oid
FROM pg_constraint ct
WHERE contype='{{constraint_type}}' AND
ct.conname = {{ name|qtLiteral }};