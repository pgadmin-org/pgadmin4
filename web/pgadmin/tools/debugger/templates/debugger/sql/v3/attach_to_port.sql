{### Attach the target to port for debugging ###}
{% if port %}
SELECT * FROM pldbg_attach_to_port({{port}}::int)
{% endif %}