{# ============================ Update View ========================= #}
{% import 'macros/security.macros' as SECLABLE %}
{% import 'macros/schemas/privilege.macros' as PRIVILEGE %}
{% if data %}
{% set view_name = data.name if data.name else o_data.name %}
{% set view_schema = data.schema if data.schema else o_data.schema %}
{% set def = data.definition.rstrip(';') if data.definition %}
{% if data.name and data.name != o_data.name %}
ALTER VIEW {{ conn|qtIdent(o_data.schema, o_data.name) }}
    RENAME TO {{ conn|qtIdent(data.name) }};
{% endif %}
{% if data.schema and data.schema != o_data.schema %}
ALTER VIEW {{ conn|qtIdent(o_data.schema, view_name ) }}
    SET SCHEMA {{ conn|qtIdent(data.schema) }};
{% endif %}
{% if data.owner and data.owner != o_data.owner %}
ALTER TABLE {{ conn|qtIdent(view_schema, view_name) }}
    OWNER TO {{ conn|qtIdent(data.owner) }};
{% endif %}
{% if def and def != o_data.definition.rstrip(';') %}
CREATE OR REPLACE VIEW {{ conn|qtIdent(view_schema, view_name) }}
    AS{{ def }};
{% endif %}
{% set old_comment = o_data.comment|default('', true) %}
{% if (data.comment is defined and (data.comment != old_comment)) %}
COMMENT ON VIEW {{ conn|qtIdent(view_schema, view_name) }}
    IS {{ data.comment|qtLiteral }};
{% endif %}
{# The SQL generated below will change privileges #}
{% if data.datacl %}
{% if 'deleted' in data.datacl %}
{% for priv in data.datacl.deleted %}
{{ PRIVILEGE.UNSETALL(conn, 'TABLE', priv.grantee, data.name, data.schema) }}
{% endfor %}
{% endif %}
{% if 'changed' in data.datacl %}
{% for priv in data.datacl.changed %}
{{ PRIVILEGE.UNSETALL(conn, 'TABLE', priv.grantee, data.name, data.schema) }}
{{ PRIVILEGE.SET(conn, 'TABLE', priv.grantee, data.name, priv.without_grant, priv.with_grant, data.schema) }}
{% endfor %}
{% endif %}
{% if 'added' in data.datacl %}
{% for priv in data.datacl.added %}
{{ PRIVILEGE.SET(conn, 'TABLE', priv.grantee, data.name, priv.without_grant, priv.with_grant, data.schema) }}
{% endfor %}
{% endif %}
{% endif %}
{# The SQL generated below will change Security Label #}
{% if data.seclabels is not none and data.seclabels|length > 0 %}
{% set seclabels = data.seclabels %}
{% if 'deleted' in seclabels and seclabels.deleted|length > 0 %}
{% for r in seclabels.deleted %}
{{ SECLABLE.DROP(conn, 'VIEW', data.name, r.provider) }}
{% endfor %}
{% endif %}
{% if 'added' in seclabels and seclabels.added|length > 0 %}
{% for r in seclabels.added %}
{{ SECLABLE.APPLY(conn, 'VIEW', data.name, r.provider, r.label) }}
{% endfor %}
{% endif %}
{% if 'changed' in seclabels and seclabels.changed|length > 0 %}
{% for r in seclabels.changed %}
{{ SECLABLE.APPLY(conn, 'VIEW', data.name, r.provider, r.label) }}
{% endfor %}
{% endif %}
{% endif %}
{% endif %}
