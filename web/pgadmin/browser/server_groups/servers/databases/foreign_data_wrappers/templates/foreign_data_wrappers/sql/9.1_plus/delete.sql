{# ============= Get foreign data wrapper from fid ============= #}
{% if fid %}
SELECT fdwname as name from pg_foreign_data_wrapper WHERE oid={{fid}}::int;
{% endif %}
{# ============= Delete/Drop cascade foreign data wrapper ============= #}
{% if name %}
DROP FOREIGN DATA WRAPPER {{ conn|qtIdent(name) }} {% if cascade %} CASCADE {% endif %};
{% endif %}