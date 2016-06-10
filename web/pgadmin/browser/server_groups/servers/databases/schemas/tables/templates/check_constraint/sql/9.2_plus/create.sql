{% if data %}
ALTER TABLE {{ conn|qtIdent(data.schema, data.table) }}
    ADD{% if data.name %} CONSTRAINT {{ conn|qtIdent(data.name) }}{% endif%} CHECK ({{ data.consrc }}){% if data.convalidated %}

    NOT VALID{% endif %}{% if data.connoinherit %} NO INHERIT{% endif %};
{% endif %}
{% if data.comment %}

COMMENT ON CONSTRAINT {{ conn|qtIdent(data.name) }} ON {{ conn|qtIdent(data.schema, data.table) }}
    IS {{ data.comment|qtLiteral }};
{% endif %}