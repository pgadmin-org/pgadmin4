{### Debug Initialization for plpgsql function ###}
{% if packge_init_oid %}
SELECT plpgsql_oid_debug({{packge_oid}}::OID, {{packge_init_oid}}::OID)
{% endif %}