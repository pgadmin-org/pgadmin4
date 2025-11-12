{### select the frame to debug the function ###}
{% if session_id and frame_id %}
SELECT
    p.pkg AS pkg, p.func AS func, p.targetName AS targetName,
    p.linenumber AS linenumber,
    CASE WHEN p.func <> 0 THEN pldbg_get_source({{session_id}}::INTEGER, p.func, p.pkg) ELSE '<No source available>' END AS src,
    (SELECT
        s.args
     FROM pldbg_get_stack({{session_id}}::INTEGER) s
     WHERE s.func = p.func AND s.pkg = p.pkg ORDER BY s.level LIMIT 1) AS args
FROM pldbg_select_frame({{session_id}}::INTEGER, {{frame_id}}::INTEGER) p
{% endif %}
