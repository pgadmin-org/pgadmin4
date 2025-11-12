SELECT node_id, node_name, node_group_name, node_kind_name
FROM bdr.node_summary
WHERE node_group_id = {{node_group_id}}
ORDER BY node_seq_id;
