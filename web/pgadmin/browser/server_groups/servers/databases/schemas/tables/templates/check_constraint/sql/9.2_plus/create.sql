{% if data %}
ALTER TABLE {{ conn|qtIdent(data.schema, data.table) }}
    ADD{% if data.name %} CONSTRAINT {{ conn|qtIdent(data.name) }}{% endif%} CHECK ({{ data.consrc }}){% if data.convalidated %}

    NOT VALID{% endif %}{% if data.connoinherit %} NO INHERIT{% endif %};
{% endif %}
