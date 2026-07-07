SELECT
    j.chain_id, j.chain_name, j.live,
    j.max_instances, j.timeout, j.self_destruct,
    j.exclusive_execution, j.on_error,
    j.client_name,
    CASE WHEN el.returncode = 0 THEN 'success' ELSE 'failure (' || returncode::text || ')' END AS status,
    el.last_run, el.finished,
    CASE
        WHEN (el.finished - el.last_run) > INTERVAL '1 day' THEN
            to_char((el.finished - el.last_run), 'DD" days "HH24"h" MI"m" SS"s"')
        ELSE
            to_char((el.finished - el.last_run), 'HH24"h" MI"m" SS"s"')
    END AS duration,
    j.run_at,
    el.last_run,
    CASE WHEN j.live THEN timetable.next_run(j.run_at) ELSE NULL END AS next_run,
    COALESCE(ac.client_name, 'Not running') AS currently_running_on
FROM
    timetable.chain j
    LEFT OUTER JOIN (
        SELECT DISTINCT ON (l.chain_id) returncode, chain_id, last_run, finished
        FROM timetable.execution_log AS l
        ORDER BY chain_id, txid DESC
    ) el ON el.chain_id = j.chain_id
    LEFT OUTER JOIN timetable.active_chain AS ac ON j.chain_id = ac.chain_id
{% if chain_id %}
WHERE j.chain_id = {{ chain_id|qtLiteral(conn) }}::integer
{% endif %}
ORDER BY j.chain_name;
