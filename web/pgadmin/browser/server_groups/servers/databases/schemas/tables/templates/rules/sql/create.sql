{# ============Create Rule============= #}
{% if display_comments %}
-- Rule: {{ data.name }} ON {{ conn|qtIdent(data.schema, data.name) }}

-- DROP Rule {{ data.name }} ON {{ conn|qtIdent(data.schema, data.name) }};

{% endif %}
{% if data.name and data.schema and data.view %}
CREATE OR REPLACE RULE {{ conn|qtIdent(data.name) }} AS
    ON {{ data.event|upper if data.event else 'SELECT' }} TO {{ conn|qtIdent(data.schema, data.view) }}
{% if data.condition %}
    WHERE {{ data.condition }}
{% endif %}
    DO{% if data.do_instead in ['true', True] %}
{{ ' INSTEAD' }}
{% else %}
{{ '' }}
{% endif %}
{% if data.statements %}
{{ data.statements.rstrip(';') }};
{% else %}
  NOTHING;
{% endif %}
{% if data.comment %}

COMMENT ON RULE {{ conn|qtIdent(data.name) }} ON {{ conn|qtIdent(data.schema, data.view) }} IS {{ data.comment|qtLiteral }};{% endif %}
{% endif %}
