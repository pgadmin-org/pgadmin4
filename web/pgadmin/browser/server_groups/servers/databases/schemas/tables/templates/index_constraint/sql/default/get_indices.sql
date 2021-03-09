SELECT relname FROM pg_catalog.pg_class, pg_catalog.pg_index
WHERE pg_catalog.pg_class.oid=indexrelid
AND indrelid={{ tid }}
