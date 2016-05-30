{# ===================== Create new view ===================== #}
{% if display_comments %}
-- View: {{ conn|qtIdent(data.schema, data.name) }}

-- DROP MATERIALIZED VIEW {{ conn|qtIdent(data.schema, data.name) }};

{% endif %}
{% if data.name and data.schema and data.definition %}
CREATE MATERIALIZED VIEW {{ conn|qtIdent(data.schema, data.name) }}
{% if(data.fillfactor or data['vacuum_data']|length > 0) %}
WITH (
{% if data.fillfactor %}
    FILLFACTOR = {{ data.fillfactor }}{% if data['autovacuum_enabled'] or data['toast_autovacuum_enabled'] or data['vacuum_data']|length > 0 %},{{ '\r' }}{% endif %}
{% endif %}
{% for field in data['vacuum_data'] %}
{% if field.value is defined and field.value != '' and field.value != none %}
{% if loop.index > 1 %},
{% endif %}    {{ field.name }} = {{ field.value|lower }}{% endif %}
{% endfor %}{{ '\r' }}
)
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
