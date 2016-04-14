{### Debug execute target for EDB spl function ###}
{% if function_oid %}
SELECT edb_oid_debug({{packge_oid}}, {{function_oid}})
{% endif %}