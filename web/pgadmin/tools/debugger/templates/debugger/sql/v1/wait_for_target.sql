{### Wait for the target for debugging ###}
{% if session_id %}
SELECT * FROM pldbg_wait_for_target({{session_id}}::int)
{% endif %}