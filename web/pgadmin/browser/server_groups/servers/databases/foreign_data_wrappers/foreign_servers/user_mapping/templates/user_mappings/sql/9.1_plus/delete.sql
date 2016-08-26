{# ============= Get the foreing server name from id ============= #}
{% if fsid %}
SELECT srvname as name FROM pg_foreign_server srv LEFT OUTER JOIN pg_foreign_data_wrapper fdw on fdw.oid=srvfdw
    WHERE srv.oid={{fsid}}::int;
{% endif %}
{# ============= Drop/Delete cascade user mapping ============= #}
{% if name and data %}
DROP USER MAPPING FOR {% if data.name == "CURRENT_USER" or data.name == "PUBLIC" %}{{ data.name }}{% else %}{{ conn|qtIdent(data.name) }}{% endif %} SERVER {{ conn|qtIdent(name) }}
{% endif %}