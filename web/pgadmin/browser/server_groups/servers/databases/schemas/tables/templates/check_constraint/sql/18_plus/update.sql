{% if data %}
{% if data.name != o_data.name %}
ALTER TABLE IF EXISTS {{ conn|qtIdent(o_data.nspname, data.table) }}
    RENAME CONSTRAINT {{ conn|qtIdent(o_data.name) }} TO {{ conn|qtIdent(data.name) }};{% endif -%}
{# A NOT ENFORCED check constraint cannot be validated, and PostgreSQL 18 #}
{# cannot change whether an existing check constraint is enforced. #}
{% if 'convalidated' in data and o_data.convalidated != data.convalidated and not data.convalidated and o_data.conenforced %}

ALTER TABLE IF EXISTS {{ conn|qtIdent(o_data.nspname, data.table) }}
    VALIDATE CONSTRAINT {{ conn|qtIdent(data.name) }};{% endif -%}
{% if data.comment is defined and data.comment != o_data.comment %}

COMMENT ON CONSTRAINT {{ conn|qtIdent(data.name) }} ON {{ conn|qtIdent(o_data.nspname, data.table) }}
    IS {{ data.comment|qtLiteral(conn) }};{% endif %}
{% endif -%}
