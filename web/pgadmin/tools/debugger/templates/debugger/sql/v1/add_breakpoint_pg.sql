{### Add PG breakpoint for debugging ###}
{% if session_id %}
SELECT * FROM pldbg_set_global_breakpoint({{session_id}}, {{function_oid}}, -1, NULL)
{% endif %}