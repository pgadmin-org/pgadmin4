{### Get the breakpoint information for debugging ###}
{% if session_id %}
SELECT * FROM pldbg_get_breakpoints({{session_id}}::int)
{% endif %}