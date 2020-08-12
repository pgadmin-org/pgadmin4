{### Get the stack information for debugging ###}
{% if session_id %}
SELECT * FROM pldbg_get_stack({{session_id}}::int) ORDER BY level
{% endif %}