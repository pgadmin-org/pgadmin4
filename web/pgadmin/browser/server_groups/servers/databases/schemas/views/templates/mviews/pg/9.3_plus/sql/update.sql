{# ===================== Update View ===================#}
{% import 'macros/schemas/security.macros' as SECLABEL %}
{% import 'macros/schemas/privilege.macros' as PRIVILEGE %}
{%- if data -%}
{% set view_name = data.name if data.name else o_data.name %}
{% set view_schema = data.schema if data.schema else o_data.schema %}
{% set def = data.definition.rstrip(';') if data.definition %}
{# ===== Rename mat view ===== #}
{% if data.name and data.name != o_data.name %}
ALTER MATERIALIZED VIEW {{ conn|qtIdent(o_data.schema, o_data.name) }}
  RENAME TO {{ conn|qtIdent(data.name) }};

{% endif %}
{# ===== Alter schema view ===== #}
{% if data.schema and data.schema != o_data.schema %}
ALTER MATERIALIZED VIEW {{ conn|qtIdent(o_data.schema, view_name ) }}
  SET SCHEMA {{ conn|qtIdent(data.schema) }};

{% endif %}
{# ===== Alter Table owner ===== #}
{% if data.owner and data.owner != o_data.owner %}
ALTER TABLE {{ conn|qtIdent(view_schema, view_name) }}
  OWNER TO {{ conn|qtIdent(data.owner) }};

{% endif %}
{# ===== First Drop and then create mat view ===== #}
{% if def and def != o_data.definition.rstrip(';') %}
DROP MATERIALIZED VIEW {{ conn|qtIdent(view_schema, view_name) }};
CREATE MATERIALIZED VIEW {{ conn|qtIdent(view_schema, view_name) }}
{% if data.fillfactor or o_data.fillfactor %}
WITH(
{% if data.fillfactor %}
    FILLFACTOR = {{ data.fillfactor }}{% if (data['vacuum_data'] is defined and data['vacuum_data']['changed']|length > 0) %},{% endif %}
{% elif o_data.fillfactor %}
    FILLFACTOR = {{ o_data.fillfactor }}{% if (data['vacuum_data'] is defined and data['vacuum_data']['changed']|length > 0) %},{% endif %}
{% endif %}

{% if data['vacuum_data']['changed']|length > 0 %}
{% for field in data['vacuum_data']['changed'] %} {{ field.name }} = {{ field.value|lower }}{% if not loop.last  %},
{% endif %}
{% endfor %}
{% endif %}
)
{% endif %}
 AS
{{ def }}
{% if data.with_data is defined %}
 WITH {{ 'DATA' if data.with_data else 'NO DATA' }};
{% elif o_data.with_data is defined %}
 WITH {{ 'DATA' if o_data.with_data else 'NO DATA' }};

{% endif %}
{% if o_data.comment and not data.comment  %}
COMMENT ON MATERIALIZED VIEW {{ conn|qtIdent(view_schema, view_name) }}
    IS {{ o_data.comment|qtLiteral }};
{% endif %}
{% else %}
{# ======= Alter Tablespace ========= #}
{%- if data.spcoid and o_data.spcoid != data.spcoid  -%}
ALTER MATERIALIZED VIEW {{ conn|qtIdent(view_schema, view_name) }}
  SET TABLESPACE {{ data.spcoid }};

{% endif %}
{# ======= SET/RESET Fillfactor ========= #}
{% if data.fillfactor and o_data.fillfactor != data.fillfactor %}
ALTER MATERIALIZED VIEW {{ conn|qtIdent(view_schema, view_name) }}
SET(
  FILLFACTOR = {{ data.fillfactor }}
);

{% elif data.fillfactor == '' and o_data.fillfactor|default('', 'true') != data.fillfactor %}
ALTER MATERIALIZED VIEW {{ conn|qtIdent(view_schema, view_name) }}
RESET(
  FILLFACTOR
);

{% endif %}
{# ===== Check for with_data property ===== #}
{% if data.with_data is defined and o_data.with_data|lower != data.with_data|lower  %}
REFRESH MATERIALIZED VIEW {{ conn|qtIdent(view_schema, view_name) }} WITH{{ ' NO' if data.with_data|lower == 'false' else '' }} DATA;

{% endif %}
{# ===== Check for Autovacuum options ===== #}
{% if data.autovacuum_custom is defined and data.autovacuum_custom == False %}
ALTER MATERIALIZED VIEW {{ conn|qtIdent(view_schema, view_name) }} RESET(
  autovacuum_enabled,
  autovacuum_vacuum_threshold,
  autovacuum_analyze_threshold,
  autovacuum_vacuum_scale_factor,
  autovacuum_analyze_scale_factor,
  autovacuum_vacuum_cost_delay,
  autovacuum_vacuum_cost_limit,
  autovacuum_freeze_min_age,
  autovacuum_freeze_max_age,
  autovacuum_freeze_table_age
);

{% endif %}

{% if data.toast_autovacuum is defined and data.toast_autovacuum == False %}
ALTER MATERIALIZED VIEW {{ conn|qtIdent(view_schema, view_name) }} RESET(
  toast.autovacuum_enabled,
  toast.autovacuum_vacuum_threshold,
  toast.autovacuum_analyze_threshold,
  toast.autovacuum_vacuum_scale_factor,
  toast.autovacuum_analyze_scale_factor,
  toast.autovacuum_vacuum_cost_delay,
  toast.autovacuum_vacuum_cost_limit,
  toast.autovacuum_freeze_min_age,
  toast.autovacuum_freeze_max_age,
  toast.autovacuum_freeze_table_age
);

{% endif %}{#-- toast_endif ends --#}
{% if data['vacuum_data']['changed']|length > 0 or data.autovacuum_enabled in ('t', 'f') or data.toast_autovacuum_enabled in ('t', 'f') %}
ALTER MATERIALIZED VIEW {{ conn|qtIdent(data.schema, data.name) }} SET(
{% if data.autovacuum_enabled in ('t', 'f') %}
    autovacuum_enabled = {% if data.autovacuum_enabled == 't' %}true{% else %}false{% endif %}{% if data['vacuum_data']['changed']|length > 0 or data.toast_autovacuum_enabled in ('t', 'f') %},
{% endif %}
{% endif %}
{% if data.toast_autovacuum_enabled in ('t', 'f') %}
    toast.autovacuum_enabled = {% if data.toast_autovacuum_enabled == 't' %}true{% else %}false{% endif %}{% if data['vacuum_data']['changed']|length > 0 %},
{% endif %}
{% endif %}
{% for field in data['vacuum_data']['changed'] %}
{% if field.value != None %}    {{ field.name }} = {{ field.value|lower }}{% if not loop.last  %},
{% endif %}
{% endif %}
{% endfor %}

);
{% endif %}
{% if data['vacuum_data']['reset']|length > 0 or data.autovacuum_enabled == 'x' or data.toast_autovacuum_enabled == 'x' %}
ALTER MATERIALIZED VIEW {{ conn|qtIdent(view_schema, view_name) }} RESET(
{% if data.autovacuum_enabled == 'x' %}
    autovacuum_enabled{% if data['vacuum_data']['reset']|length > 0 or data.toast_autovacuum_enabled == 'x' %},
{% endif %}
{% endif %}
{% if data.toast_autovacuum_enabled == 'x' %}
    toast.autovacuum_enabled{% if data['vacuum_data']['reset']|length > 0 %},
{% endif %}
{% endif %}
{% for field in data['vacuum_data']['reset'] %}    {{ field.name }}{% if not loop.last  %},
{% endif %}
{% endfor %}

);
{% endif %}
{# ===== End check for custom autovacuum ===== #}
{% endif %}{# ===== End block for check data definition ===== #}
{% set old_comment = o_data.comment|default('', true) %}
{% if (data.comment is defined and (data.comment != old_comment)) %}

COMMENT ON MATERIALIZED VIEW {{ conn|qtIdent(view_schema, view_name) }}
  IS {{ data.comment|qtLiteral }};
{% endif %}
{# ============= The SQL generated below will change privileges ============= #}
{% if data.datacl %}
{% if 'deleted' in data.datacl %}
{% for priv in data.datacl.deleted %}
{{ PRIVILEGE.UNSETALL(conn, 'TABLE', priv.grantee, data.name, data.schema) }}
{% endfor %}
{% endif %}
{% if 'changed' in data.datacl %}
{% for priv in data.datacl.changed -%}
{% if priv.grantee != priv.old_grantee %}
{{ PRIVILEGE.UNSETALL(conn, 'TABLE', priv.old_grantee, data.name, data.schema) }}
{% else %}
{{ PRIVILEGE.UNSETALL(conn, 'TABLE', priv.grantee, data.name, data.schema) }}
{% endif %}
{{ PRIVILEGE.SET(conn, 'TABLE', priv.grantee, data.name, priv.without_grant, priv.with_grant, data.schema) }}
{%- endfor %}
{% endif %}
{% if 'added' in data.datacl %}
{% for priv in data.datacl.added %}
{{ PRIVILEGE.SET(conn, 'TABLE', priv.grantee, data.name, priv.without_grant, priv.with_grant, data.schema) }}
{% endfor %}
{% endif %}
{% endif %}
{# ============== The SQL generated below will change Security Label ========= #}
{% if data.seclabels is not none and data.seclabels|length > 0 %}
{% set seclabels = data.seclabels %}
{% if 'deleted' in seclabels and seclabels.deleted|length > 0 %}
{% for r in seclabels.deleted %}
{{ SECLABEL.UNSET(conn, 'MATERIALIZED VIEW', data.name, r.provider, data.schema) }}
{% endfor %}
{% endif %}
{% if 'added' in seclabels and seclabels.added|length > 0 %}
{% for r in seclabels.added %}
{{ SECLABEL.SET(conn, 'MATERIALIZED VIEW', data.name, r.provider, r.label, data.schema) }}
{% endfor %}
{% endif %}
{% if 'changed' in seclabels and seclabels.changed|length > 0 %}
{% for r in seclabels.changed %}
{{ SECLABEL.SET(conn, 'MATERIALIZED VIEW', data.name, r.provider, r.label, data.schema) }}
{% endfor %}
{% endif %}
{% endif %}
{% endif %}
