{### select the frame to debug the function ###}
{% if session_id %}
SELECT
    p.func AS func, p.targetName AS targetName,
    p.linenumber AS linenumber,
    pldbg_get_source({{session_id}}::INTEGER, p.func) AS src,
    (SELECT
        s.args
     FROM pldbg_get_stack({{session_id}}::INTEGER) s
     WHERE s.func = p.func ORDER BY s.level LIMIT 1) AS args
FROM pldbg_wait_for_breakpoint({{session_id}}::INTEGER) p
{% endif %}
