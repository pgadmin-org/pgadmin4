WITH raft_status AS (
    SELECT *
    FROM json_to_record((SELECT * FROM bdr.get_raft_status())) AS rs(
        instance_id oid, server_id oid, state text, leader_type text, leader oid,
        voting bool, voted_for_type text, voted_for_id oid
    )
)
SELECT n.node_name, n.node_group_name, rs.*,
    (SELECT node_name FROM bdr.node_summary WHERE node_id = rs.leader) AS leader_name,
    (SELECT node_name FROM bdr.node_summary WHERE node_id = rs.voted_for_id) AS voting_for
FROM bdr.node_summary n
    LEFT JOIN raft_status rs
    ON n.node_id = rs.server_id
ORDER BY n.node_seq_id;
