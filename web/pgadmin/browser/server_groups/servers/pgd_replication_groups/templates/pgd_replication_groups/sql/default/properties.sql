SELECT ng.node_group_id, ng.node_group_name,
    (SELECT node_group_name FROM bdr.node_group WHERE node_group_id = ng.node_group_parent_id) AS node_group_parent,
    bdr.node_group_type(node_group_name::text) AS node_group_type,
    bdr.streaming_mode_name(ng.node_group_streaming_mode) AS streaming_mode_name,
    ng.node_group_location, ng.node_group_enable_proxy_routing, ng.node_group_enable_raft
FROM bdr.node_group ng
WHERE ng.node_group_parent_id != 0
{% if node_group_id %}
AND ng.node_group_id={{node_group_id}}
{% endif %}
ORDER BY ng.node_group_name
