{### Get the name and schema of an extended statistics object ###}
SELECT
    s.stxname AS name,
    ns.nspname AS schema
FROM pg_catalog.pg_statistic_ext s
    LEFT JOIN pg_catalog.pg_namespace ns ON ns.oid = s.stxnamespace
WHERE s.oid = {{stid}}::oid;
