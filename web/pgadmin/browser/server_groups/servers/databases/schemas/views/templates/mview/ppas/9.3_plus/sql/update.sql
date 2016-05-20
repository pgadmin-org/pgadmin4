{# ===================== Update View ===================#}
{% import 'macros/security.macros' as SECLABLE %}
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
{% if data['vacuum_data']['reset']|length == 0 and
data['vacuum_data']['changed']|length == 0 and data['settings']|length > 0 %}
ALTER MATERIALIZED VIEW {{ conn|qtIdent(view_schema, view_name) }}
SET(
{% for field in data['settings'] %}
  {{ field }} = {{ data['settings'][field]|lower }}{% if not loop.last  %},{% endif %}{{ '\r' }}
{% endfor %}
);

{% endif %}
{% if data['vacuum_data']['reset']|length > 0 %}
ALTER MATERIALIZED VIEW {{ conn|qtIdent(view_schema, view_name) }}
RESET(
{% for field in data['vacuum_data']['reset'] %}
  {{ field.name }}{% if not loop.last  %},{% endif %}{{ '\r' }}
{% endfor %}
);
{% endif %}
{# ===== First Drop and then create mat view ===== #}
{% if def and def != o_data.definition.rstrip(';') %}
{% if data.fillfactor or ( data['vacuum_data']['changed']|length > 0 ) %}
DROP MATERIALIZED VIEW {{ conn|qtIdent(view_schema, view_name) }};
CREATE MATERIALIZED VIEW {{ conn|qtIdent(view_schema, view_name) }}
WITH(
{% if data.fillfactor %}
  FILLFACTOR = {{ data.fillfactor }}{% if data['vacuum_data']['changed']|length > 0 %},{% endif %}{{ '\r' }}
{% endif %}
{% if data['vacuum_data']['changed']|length > 0 %}
{% for field in data['vacuum_data']['changed'] %}
  {{ field.name }} = {{ field.value|lower }}{% if not loop.last  %},{% endif %}{{ '\r' }}
{% endfor %}
{% endif %}
)
 AS
{{ def }}
{% if data.with_data %}
 WITH DATA;

{% else %}
 WITH NO DATA;

{% endif %}
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
SET(FILLFACTOR = {{ data.fillfactor }});

{% elif data.fillfactor == '' %}
ALTER MATERIALIZED VIEW {{ conn|qtIdent(view_schema, view_name) }}
RESET(
  FILLFACTOR
);

{% endif %}
{# ===== Check for with_data property ===== #}
{% if data.with_data is defined and o_data.with_data|lower != data.with_data|lower  %}
REFRESH MATERIALIZED VIEW {{ conn|qtIdent(view_schema, view_name) }} WITH{{ ' NO' if data.with_data|lower == 'false' else '' }} DATA;

{% endif %}
{# ===== Check for Table tab properties ===== #}
{% if ((data.autovacuum_custom is defined and data.autovacuum_custom|lower == 'false') or
(data.toast_autovacuum is defined and data.toast_autovacuum|lower == 'false')
) %}
{% if data.autovacuum_custom is defined %}
ALTER MATERIALIZED VIEW {{ conn|qtIdent(view_schema, view_name) }}
RESET(
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
{% if data.toast_autovacuum is defined %}
ALTER MATERIALIZED VIEW {{ conn|qtIdent(view_schema, view_name) }}
RESET(
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
{% endif %}
{% elif(data['vacuum_data']['changed']|length > 0) %}
ALTER MATERIALIZED VIEW {{ conn|qtIdent(data.schema, data.name) }} SET(
{% for field in data['vacuum_data']['changed'] %}
{% if field.value != None %}
  {{ field.name }} = {{ field.value|lower }}{% if not loop.last  %},{% endif %}{{ '\r' }}
{% endif %}
{% endfor %}
);

{% endif %}{# ===== End check for custom autovaccum ===== #}
{% endif %}{# ===== End block for check data definition ===== #}
{% if data.comment and data.comment != o_data.comment %}

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
{{ PRIVILEGE.UNSETALL(conn, 'TABLE', priv.grantee, data.name, data.schema) }}
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
{{ SECLABLE.DROP(conn, 'VIEW', data.name, r.provider) }}
{% endfor %}
{% endif %}
{% if 'added' in seclabels and seclabels.added|length > 0 %}
{% for r in seclabels.added %}
{{ SECLABLE.APPLY(conn, 'VIEW', data.name, r.provider, r.security_label) }}
{% endfor %}
{% endif %}
{% if 'changed' in seclabels and seclabels.changed|length > 0 %}
{% for r in seclabels.changed %}
{{ SECLABLE.APPLY(conn, 'VIEW', data.name, r.provider, r.security_label) }}
{% endfor %}
{% endif %}
{% endif %}
{% endif %}
