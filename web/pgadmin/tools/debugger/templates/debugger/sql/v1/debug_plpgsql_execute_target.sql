{### Debug execute target for plpgsql function ###}
{% if function_oid %}
SELECT plpgsql_oid_debug({{packge_oid}}, {{function_oid}})
{% endif %}