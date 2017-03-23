SELECT ct.oid,
    NOT convalidated as convalidated
FROM pg_constraint ct
WHERE contype='f' AND
ct.conname = {{ name|qtLiteral }};