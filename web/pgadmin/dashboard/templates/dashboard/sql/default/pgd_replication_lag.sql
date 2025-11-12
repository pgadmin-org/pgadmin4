SELECT n.node_name as source_name, nr.target_name,
    EXTRACT(epoch FROM nr.replay_lag)::bigint, nr.replay_lag_bytes
FROM bdr.node_replication_rates nr, bdr.local_node_summary n


