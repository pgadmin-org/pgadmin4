{### Check whether extended statistics are supported ###}
SELECT
    CASE WHEN COUNT(*) > 0 THEN TRUE ELSE FALSE END AS has_statistics
FROM pg_catalog.pg_class c
WHERE c.relname = 'pg_statistic_ext'
    AND c.relnamespace = 'pg_catalog'::regnamespace
