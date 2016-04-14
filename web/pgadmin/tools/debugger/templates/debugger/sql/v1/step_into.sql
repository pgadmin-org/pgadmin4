{### Step into function for debugging ###}
{% if session_id %}
SELECT
    p.pkg AS pkg, p.func AS func, p.targetName AS targetName,
    p.linenumber AS linenumber, pldbg_get_source({{session_id}}::INTEGER, p.pkg, p.func) AS src,
    (SELECT
        s.args
     FROM pldbg_get_stack({{session_id}}::INTEGER) s
     WHERE s.func = p.func AND s.pkg = p.pkg) AS args
FROM pldbg_step_into({{session_id}}::INTEGER) p
{% endif %}