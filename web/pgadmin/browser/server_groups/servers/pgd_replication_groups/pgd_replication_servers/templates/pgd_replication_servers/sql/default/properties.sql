SELECT node_name, node_group_name, interface_connstr,
    peer_state_name, peer_target_state_name, node_seq_id, node_local_dbname,
    node_id, node_group_id, node_kind_name
FROM
    bdr.node_summary
WHERE node_group_id = {{node_group_id}}
{% if node_id %}
AND node_id={{node_id}}
{% endif %}
ORDER BY node_seq_id;
