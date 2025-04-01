SELECT node_group_id, node_group_name
FROM bdr.node_group
WHERE node_group_parent_id != 0
ORDER BY node_group_name
