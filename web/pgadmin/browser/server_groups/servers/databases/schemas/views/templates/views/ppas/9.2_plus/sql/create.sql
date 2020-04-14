{#============================Create new view=========================#}
{% if display_comments %}
-- View: {{ data.schema }}.{{ data.name }}

-- DROP VIEW {{ conn|qtIdent(data.schema, data.name) }};

{% endif %}
{% if data.name and data.schema and data.definition %}
CREATE OR REPLACE VIEW {{ conn|qtIdent(data.schema, data.name) }}{% if (data.security_barrier) %}
WITH (
{% if data.security_barrier %}    security_barrier={{ data.security_barrier|lower }}{% endif %}
){% endif %} AS
{{ data.definition.rstrip(';') }};
{% if data.owner %}

ALTER TABLE {{ conn|qtIdent(data.schema, data.name) }}
    OWNER TO {{ conn|qtIdent(data.owner) }};
{% endif %}
{% if data.comment %}
COMMENT ON VIEW {{ conn|qtIdent(data.schema, data.name) }}
    IS {{ data.comment|qtLiteral }};
{% endif %}
{% endif %}
