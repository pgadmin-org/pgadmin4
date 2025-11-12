{### Abort the target for debugging ###}
{% if session_id %}
SELECT * FROM pldbg_abort_target({{session_id}}::int)
{% endif %}