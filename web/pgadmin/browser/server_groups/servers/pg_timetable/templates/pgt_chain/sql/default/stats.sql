SELECT
    el.txid AS {{ conn|qtIdent(_('Run')) }},
    CASE WHEN el.returncode = 0 THEN 'success' ELSE 'failure (' || returncode::text || ')' END  AS {{ conn|qtIdent(_('Status')) }},
    el.last_run AS {{ conn|qtIdent(_('Start time')) }},
    el.finished AS {{ conn|qtIdent(_('End time')) }},
    CASE
        WHEN (el.finished - el.last_run) > INTERVAL '1 day' THEN
            to_char((el.finished - el.last_run), 'DD" days "HH24"h" MI"m" SS"s"')
        ELSE
            to_char((el.finished - el.last_run), 'HH24"h" MI"m" SS"s"')
    END AS {{ conn|qtIdent(_('Duration')) }},
    t.task_name AS {{ conn|qtIdent(_('Task')) }}
FROM
    timetable.execution_log AS el INNER JOIN timetable.task AS t On (el.chain_id = t.chain_id AND el.task_id = t.task_id)
WHERE
    el.chain_id = {{ chain_id|qtLiteral(conn) }}::integer
ORDER BY last_run DESC, txid DESC
LIMIT {{ rows_threshold }};
