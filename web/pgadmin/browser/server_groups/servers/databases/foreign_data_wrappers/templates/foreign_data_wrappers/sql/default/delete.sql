{# ============= Get foreign data wrapper from fid ============= #}
{% if fid %}
SELECT fdwname as name from pg_catalog.pg_foreign_data_wrapper WHERE oid={{fid}}::oid;
{% endif %}
{# ============= Delete/Drop cascade foreign data wrapper ============= #}
{% if name %}
DROP FOREIGN DATA WRAPPER IF EXISTS {{ conn|qtIdent(name) }} {% if cascade %} CASCADE {% endif %};
{% endif %}
