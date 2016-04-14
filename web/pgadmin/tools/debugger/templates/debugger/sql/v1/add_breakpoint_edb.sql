{### Add EDB breakpoints for debugging ###}
{% if session_id %}
SELECT * FROM pldbg_set_global_breakpoint({{session_id}}::int, {{package_oid}}::int, {{function_oid}}::OID, -1, {{target_oid}}::int)
{% endif %}