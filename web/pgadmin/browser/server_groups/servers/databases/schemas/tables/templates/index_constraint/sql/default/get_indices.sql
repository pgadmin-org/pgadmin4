SELECT relname FROM pg_class, pg_index
WHERE pg_class.oid=indexrelid
AND indrelid={{ tid }}