{### select the frame to debug the function ###}
{% if session_id %}
SELECT
    p.func AS func, p.targetName AS targetName, p.linenumber AS linenumber,
    CASE WHEN p.func <> 0 THEN pldbg_get_source({{session_id}}::INTEGER, p.func) ELSE '<No source available>' END AS src,
    (SELECT
        s.args
     FROM pldbg_get_stack({{session_id}}::INTEGER) s
     WHERE s.func = p.func) AS args
FROM pldbg_select_frame({{session_id}}::INTEGER, {{frame_id}}::INTEGER) p
{% endif %}