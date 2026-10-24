SELECT
    txid AS {{ conn|qtIdent(_('Run')) }},
    CASE WHEN returncode = 0 THEN 'success' ELSE 'failure (' || returncode::text || ')' END AS {{ conn|qtIdent(_('Status')) }},
    last_run AS {{ conn|qtIdent(_('Start time')) }},
    CASE
        WHEN (el.finished - el.last_run) > INTERVAL '1 day' THEN
            to_char((el.finished - el.last_run), 'DD" days "HH24"h" MI"m" SS"s"')
        ELSE
            to_char((el.finished - el.last_run), 'HH24"h" MI"m" SS"s"')
    END  AS {{ conn|qtIdent(_('Duration')) }},
    el.finished AS {{ conn|qtIdent(_('End time')) }},
    left(output,500) AS {{ conn|qtIdent(_('Output')) }}
FROM
    timetable.execution_log AS el
WHERE
    chain_id = {{ chain_id|qtLiteral(conn) }}::integer
    AND task_id = {{ task_id|qtLiteral(conn) }}::integer
ORDER BY last_run DESC NULLS FIRST, txid DESC
LIMIT {{ rows_threshold }};
