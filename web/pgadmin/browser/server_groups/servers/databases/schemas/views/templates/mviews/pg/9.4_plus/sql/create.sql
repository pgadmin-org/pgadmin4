{# ===================== Create new view ===================== #}
{% if display_comments %}
-- View: {{ data.schema }}.{{ data.name }}

-- DROP MATERIALIZED VIEW {{ conn|qtIdent(data.schema, data.name) }};

{% endif %}
{% if data.name and data.schema and data.definition %}
CREATE MATERIALIZED VIEW {{ conn|qtIdent(data.schema, data.name) }}
{% if(data.fillfactor or data.autovacuum_enabled in ('t', 'f') or data.toast_autovacuum_enabled in ('t', 'f') or data['vacuum_data']|length > 0) %}
{% set ns = namespace(add_comma=false) %}
WITH (
{% if data.fillfactor %}
    FILLFACTOR = {{ data.fillfactor }}{% set ns.add_comma = true%}{% endif %}{% if data.autovacuum_enabled in ('t', 'f') %}
{% if ns.add_comma %},
{% endif %}
    autovacuum_enabled = {% if data.autovacuum_enabled == 't' %}TRUE{% else %}FALSE{% endif %}{% set ns.add_comma = true%}{% endif %}{% if data.toast_autovacuum_enabled in ('t', 'f')  %}
{% if ns.add_comma %},
{% endif %}
    toast.autovacuum_enabled = {% if data.toast_autovacuum_enabled == 't' %}TRUE{% else %}FALSE{% endif %}{% set ns.add_comma = true%}{% endif %}
{% for field in data['vacuum_data'] %}
{% if field.value is defined and field.value != '' and field.value != none %}
{% if ns.add_comma %},
{% endif %}    {{ field.name }} = {{ field.value|lower }}{% set ns.add_comma = true%}{% endif %}{% endfor %}
{{ '\n' }})
{% endif %}
{% if data.spcname %}TABLESPACE {{ data.spcname }}
{% endif %}AS
{{ data.definition.rstrip(';') }}
{% if data.with_data %}
WITH DATA;
{% else %}
WITH NO DATA;
{% endif %}
{% if data.owner %}

ALTER TABLE {{ conn|qtIdent(data.schema, data.name) }}
    OWNER TO {{ conn|qtIdent(data.owner) }};
{% endif %}
{% if data.comment %}

COMMENT ON MATERIALIZED VIEW {{ conn|qtIdent(data.schema, data.name) }}
    IS {{ data.comment|qtLiteral }};
{% endif %}
{% endif %}
