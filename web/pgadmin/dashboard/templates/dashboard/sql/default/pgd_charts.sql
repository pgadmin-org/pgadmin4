{% set add_union = false %}
{% if 'pgd_replication_lag' in chart_names %}
{% set add_union = true %}
    SELECT 'pgd_replication_lag' AS chart_name, pg_catalog.json_agg(t) AS chart_data
    FROM (
        SELECT n.node_name || '-' || nr.target_name as name,
            EXTRACT(epoch FROM nr.replay_lag)::bigint as replay_lag, nr.replay_lag_bytes
        FROM bdr.node_replication_rates nr, bdr.local_node_summary n
    ) t
{% endif %}
