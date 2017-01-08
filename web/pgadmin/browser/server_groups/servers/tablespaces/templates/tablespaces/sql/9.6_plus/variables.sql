{### SQL to fetch tablespace object options ###}
SELECT name, vartype, min_val, max_val, enumvals
FROM pg_settings
WHERE name IN ('seq_page_cost', 'random_page_cost', 'effective_io_concurrency');