SELECT ct.oid,
    true as convalidated
FROM pg_catalog.pg_constraint ct
WHERE contype='f' AND
ct.conname = {{ name|qtLiteral }};
