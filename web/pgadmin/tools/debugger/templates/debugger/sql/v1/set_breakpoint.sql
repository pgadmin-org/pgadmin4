{### Set the breakpoints for debugging ###}
{% if session_id %}
SELECT * FROM pldbg_set_breakpoint({{session_id}}::int ,{{poid}}::OID, {{foid}}::OID, {{line_number}}::int)
{% endif %}