{% if data %}
ALTER TABLE IF EXISTS {{ conn|qtIdent(data.schema, data.table) }}
    ADD{% if data.name %} CONSTRAINT {{ conn|qtIdent(data.name) }}{% endif%} CHECK ({{ data.consrc }}){% if data.conenforced is defined and not data.conenforced %}

    NOT ENFORCED{% elif data.convalidated %}

    NOT VALID{% endif %}{% if data.connoinherit %} NO INHERIT{% endif %};
{% endif %}
{% if data.comment %}

COMMENT ON CONSTRAINT {{ conn|qtIdent(data.name) }} ON {{ conn|qtIdent(data.schema, data.table) }}
    IS {{ data.comment|qtLiteral(conn) }};
{% endif %}
