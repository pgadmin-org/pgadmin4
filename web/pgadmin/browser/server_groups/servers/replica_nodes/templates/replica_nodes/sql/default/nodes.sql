SELECT pid, 'Standby ['||COALESCE(host(client_addr), client_hostname, 'Socket')||']' as name
FROM pg_stat_replication
ORDER BY pid
