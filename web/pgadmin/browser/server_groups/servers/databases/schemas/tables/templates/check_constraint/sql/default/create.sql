{% if data %}
ALTER TABLE {{ conn|qtIdent(data.schema, data.table) }}
    ADD{% if data.name %} CONSTRAINT {{ conn|qtIdent(data.name) }}{% endif%} CHECK ({{ data.consrc }});
{% endif %}
{% if data.comment %}

COMMENT ON CONSTRAINT {{ conn|qtIdent(data.name) }} ON {{ conn|qtIdent(data.schema, data.table) }}
    IS {{ data.comment|qtLiteral }};
{% endif %}