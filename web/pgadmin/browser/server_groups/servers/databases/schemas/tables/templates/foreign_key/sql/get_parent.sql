SELECT nsp.nspname AS schema,
    rel.relname AS table
FROM
    pg_class rel
JOIN pg_namespace nsp
ON rel.relnamespace = nsp.oid::int
WHERE rel.oid = {{tid}}::int