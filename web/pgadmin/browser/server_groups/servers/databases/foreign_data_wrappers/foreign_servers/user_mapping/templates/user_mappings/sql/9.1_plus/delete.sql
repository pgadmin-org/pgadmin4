{# ============= Get the foreing server name from id ============= #}
{% if fsid %}
SELECT srvname as name FROM pg_foreign_server srv LEFT OUTER JOIN pg_foreign_data_wrapper fdw on fdw.oid=srvfdw
    WHERE srv.oid={{fsid}}::int;
{% endif %}
{# ============= Drop/Delete cascade user mapping ============= #}
{% if name and data %}
DROP USER MAPPING FOR  {{ conn|qtIdent(data.name) }} SERVER {{ conn|qtIdent(name) }}
{% endif %}