{### Debug Initialization for EDB spl function ###}
{% if packge_init_oid %}
SELECT edb_oid_debug({{packge_oid}}::OID, {{packge_init_oid}}::OID)
{% endif %}