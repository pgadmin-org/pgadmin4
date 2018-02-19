/*pga4dash*/
SELECT
    pid,
    datname,
    usename,
    application_name,
    client_addr,
    to_char(backend_start, 'YYYY-MM-DD HH24:MI:SS TZ') AS backend_start,
    state,
    CASE WHEN waiting THEN '{{ _('yes') }}' ELSE '{{ _('no') }}' END AS waiting,
    query,
    to_char(state_change, 'YYYY-MM-DD HH24:MI:SS TZ') AS state_change,
    to_char(query_start, 'YYYY-MM-DD HH24:MI:SS TZ') AS query_start
FROM
    pg_stat_activity
{% if did %}WHERE
    datname = (SELECT datname FROM pg_database WHERE oid = {{ did }}){% endif %}
ORDER BY pid
