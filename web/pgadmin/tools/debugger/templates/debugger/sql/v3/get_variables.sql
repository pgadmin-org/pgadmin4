{### Get the variables information for debugging ###}
{% if session_id %}
SELECT
    name, varClass, value,
    pg_catalog.format_type(dtype, NULL) as dtype, isconst
FROM pldbg_get_variables({{session_id}}::int)
ORDER BY varClass
{% endif %}