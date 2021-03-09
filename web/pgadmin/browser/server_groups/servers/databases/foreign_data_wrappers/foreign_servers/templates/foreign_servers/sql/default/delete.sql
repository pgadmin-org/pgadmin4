{# ============= Give foreign server name from foreign server id ============= #}
{% if fsid %}
SELECT srvname as name FROM pg_foreign_server srv LEFT OUTER JOIN pg_catalog.pg_foreign_data_wrapper fdw on fdw.oid=srvfdw
WHERE srv.oid={{fsid}}::oid;
{% endif %}
{# ============= Delete/Drop cascade foreign server ============= #}
{% if name %}
DROP SERVER {{ conn|qtIdent(name) }} {% if cascade %} CASCADE {% endif %};
{% endif %}
