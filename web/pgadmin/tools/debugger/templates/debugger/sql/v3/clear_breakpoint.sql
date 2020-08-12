{### Clear breakpoints for debugging ###}
{% if session_id %}
SELECT * FROM pldbg_drop_breakpoint({{session_id}}::int, {{foid}}::OID, {{line_number}}::int)
{% endif %}