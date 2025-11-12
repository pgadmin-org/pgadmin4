WITH node_details AS (
    SELECT node_id, version() pg_version, bdr.bdr_version() bdr_version
    FROM bdr.local_node
)
SELECT ns.*, nd.*,
    ni.catchup_state_name
FROM bdr.node_summary ns
    LEFT JOIN node_details nd
    ON ns.node_id = nd.node_id
    LEFT JOIN bdr.node_catchup_info_details ni
    ON ns.node_id = ni.target_node_id
    ORDER BY node_seq_id;
