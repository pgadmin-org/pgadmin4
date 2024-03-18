SELECT pid, 'Standby ['||COALESCE(client_addr::text, client_hostname,'Socket')||']' as name
FROM pg_stat_replication
ORDER BY pid
