{### Step into function for debugging ###}
{% if session_id %}
SELECT
    p.func, p.targetName, p.linenumber,
    pldbg_get_source({{session_id}}::INTEGER, p.func) AS src,
    (SELECT
        s.args
     FROM pldbg_get_stack({{session_id}}::INTEGER) s
     WHERE s.func = p.func) AS args
FROM pldbg_step_into({{session_id}}::INTEGER) p
{% endif %}