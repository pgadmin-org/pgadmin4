SELECT nsp.nspname AS schema ,rel.relname AS table
FROM pg_class rel
    JOIN pg_namespace nsp
    ON rel.relnamespace = nsp.oid::oid
    WHERE rel.oid = {{tid}}::oid