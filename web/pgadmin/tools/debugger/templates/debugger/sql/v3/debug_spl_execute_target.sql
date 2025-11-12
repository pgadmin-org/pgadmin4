{### Debug execute target for EDB spl function ###}
{% if function_oid %}
SELECT edb_oid_debug({{function_oid}})
{% endif %}