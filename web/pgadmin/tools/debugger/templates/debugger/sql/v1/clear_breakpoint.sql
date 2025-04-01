{### Clear breakpoints for debugging ###}
{% if session_id %}
SELECT * FROM pldbg_drop_breakpoint({{session_id}}::int, {{poid}}::OID, {{foid}}::OID, {{line_number}}::int)
{% endif %}