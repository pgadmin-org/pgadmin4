{### Set the breakpoints for debugging ###}
{% if session_id %}
SELECT * FROM pldbg_set_breakpoint({{session_id}}::int, {{foid}}::OID,{{line_number}}::int)
{% endif %}