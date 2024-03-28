SELECT CASE
    WHEN (SELECT count(extname) FROM pg_catalog.pg_extension WHERE extname='bdr') > 0
    THEN 'pgd'
    WHEN (SELECT COUNT(*) FROM pg_stat_replication) > 0
    THEN 'log'
    ELSE NULL
END as type;
