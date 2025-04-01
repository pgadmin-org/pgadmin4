SELECT nspname AS schema, collname AS name
FROM pg_catalog.pg_collation c, pg_catalog.pg_namespace n
WHERE c.collnamespace = n.oid AND
    n.oid = {{ scid }}::oid AND
    c.oid = {{ coid }}::oid;
