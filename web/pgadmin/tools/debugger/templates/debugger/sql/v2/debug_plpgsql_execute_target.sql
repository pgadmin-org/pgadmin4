{### Debug execute target for plpgsql function ###}
{% if function_oid %}
SELECT plpgsql_oid_debug({{function_oid}})
{% endif %}