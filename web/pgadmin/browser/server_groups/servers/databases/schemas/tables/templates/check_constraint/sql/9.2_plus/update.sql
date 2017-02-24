{% if data %}
{% if data.name != o_data.name %}
ALTER TABLE {{ conn|qtIdent(o_data.nspname, data.table) }}
    RENAME CONSTRAINT {{ conn|qtIdent(o_data.name) }} TO {{ conn|qtIdent(data.name) }};{% endif -%}
{% if 'convalidated' in data and o_data.convalidated != data.convalidated and not data.convalidated %}

ALTER TABLE {{ conn|qtIdent(o_data.nspname, data.table) }}
    VALIDATE CONSTRAINT {{ conn|qtIdent(data.name) }};{% endif -%}
{% if data.comment is defined and data.comment != o_data.comment %}

COMMENT ON CONSTRAINT {{ conn|qtIdent(data.name) }} ON {{ conn|qtIdent(o_data.nspname, data.table) }}
    IS {{ data.comment|qtLiteral }};{% endif %}
{% endif -%}