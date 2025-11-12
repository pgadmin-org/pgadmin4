{# SQL query for getting datatypes #}
SELECT n.nspname schema_name,
    t.typname object_name
FROM pg_catalog.pg_type t
    INNER JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE (t.typrelid = 0 OR (SELECT c.relkind = 'c' FROM pg_catalog.pg_class c WHERE c.oid = t.typrelid))
    AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_type el WHERE el.oid = t.typelem AND el.typarray = t.oid)
    AND n.nspname IN ({{schema_names}})
ORDER BY 1, 2;
