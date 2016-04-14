{### Change the variable value and submit during debugging ###}
{% if session_id %}
SELECT * FROM pldbg_deposit_value({{session_id}}::int, {{var_name|qtLiteral }}, {{line_number}}, {{val|qtLiteral}})
{% endif %}