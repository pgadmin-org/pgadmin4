/*pga4dash*/
SELECT
    pid,
    datname,
    usename,
    application_name,
    client_addr,
    pg_catalog.to_char(backend_start, 'YYYY-MM-DD HH24:MI:SS TZ') AS backend_start,
    state,
    wait_event_type || ': ' || wait_event AS wait_event,
    pg_catalog.pg_blocking_pids(pid) AS blocking_pids,
    query,
    pg_catalog.to_char(state_change, 'YYYY-MM-DD HH24:MI:SS TZ') AS state_change,
    pg_catalog.to_char(query_start, 'YYYY-MM-DD HH24:MI:SS TZ') AS query_start
FROM
    pg_catalog.pg_stat_activity
{% if did %}WHERE
    datname = (SELECT datname FROM pg_catalog.pg_database WHERE oid = {{ did }}){% endif %}
ORDER BY pid
