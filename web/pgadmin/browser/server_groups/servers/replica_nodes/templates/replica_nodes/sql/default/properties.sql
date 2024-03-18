SELECT st.*, 'Standby ['||COALESCE(client_addr::text, client_hostname,'Socket')||']' as name,
    sl.slot_name, sl.slot_type, sl.active
FROM pg_stat_replication st JOIN pg_replication_slots sl
ON st.pid = sl.active_pid
{% if pid %}
WHERE st.pid={{pid}}
{% endif %}
ORDER BY st.pid
