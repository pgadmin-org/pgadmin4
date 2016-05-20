{% if data %}
ALTER TABLE {{ conn|qtIdent(data.schema, data.table) }}
    ADD{% if data.name %} CONSTRAINT {{ conn|qtIdent(data.name) }}{% endif%} CHECK ({{ data.consrc }});
{% endif %}
