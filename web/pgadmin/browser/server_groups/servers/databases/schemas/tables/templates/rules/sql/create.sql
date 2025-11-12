{# ============Create Rule============= #}
{% if display_comments %}
-- Rule: {{ conn|qtIdent(data.name) }} ON {{ conn|qtIdent(data.schema, data.view) }}

-- DROP Rule IF EXISTS {{ conn|qtIdent(data.name) }} ON {{ conn|qtIdent(data.schema, data.view) }};

{% endif %}
{% if data.name and data.schema and data.view %}
CREATE{% if add_replace_clause %} OR REPLACE{% endif %} RULE {{ conn|qtIdent(data.name) }} AS
    ON {{ data.event|upper if data.event else 'SELECT' }} TO {{ conn|qtIdent(data.schema, data.view) }}
{% if data.condition %}
    WHERE ({{ data.condition }})
{% endif %}
    DO{% if data.do_instead in ['true', True] %}
{{ ' INSTEAD' }}{% else %}{{ '' }}{% endif %}
{% if data.statements is defined and data.statements.strip() in ['', 'NOTHING'] %}
 NOTHING;
{% elif data.statements is defined %}

({{ data.statements.rstrip(';') }});
{% else %}
 NOTHING;
{% endif %}
{% if data.comment %}

COMMENT ON RULE {{ conn|qtIdent(data.name) }} ON {{ conn|qtIdent(data.schema, data.view) }} IS {{ data.comment|qtLiteral(conn) }};{% endif %}
{% endif %}
