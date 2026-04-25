{### Check if extended statistics are supported (PostgreSQL 10+) ###}
SELECT
    CASE WHEN COUNT(*) > 0 THEN TRUE ELSE FALSE END AS has_statistics
FROM pg_catalog.pg_class
WHERE relname='pg_statistic_ext'
