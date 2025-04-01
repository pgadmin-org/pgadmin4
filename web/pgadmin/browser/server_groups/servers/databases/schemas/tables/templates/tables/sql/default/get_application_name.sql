SELECT
    usename,
    application_name
FROM
    pg_catalog.pg_stat_activity
WHERE
    pid =  {{ pid }}
ORDER BY pid
