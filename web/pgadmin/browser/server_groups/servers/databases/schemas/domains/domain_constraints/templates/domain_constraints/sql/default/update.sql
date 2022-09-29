{% set name = o_data.name %}
{% if data.name %}
{% set name = data.name %}
ALTER DOMAIN {{ conn|qtIdent(o_data.nspname, o_data.relname) }}
    RENAME CONSTRAINT {{ conn|qtIdent(o_data.name) }} TO {{ conn|qtIdent(data.name) }};{% endif -%}{% if data.convalidated %}


ALTER DOMAIN {{ conn|qtIdent(o_data.nspname, o_data.relname) }}
    VALIDATE CONSTRAINT {{ conn|qtIdent(name) }};{% endif -%}{% if data.description is defined %}


COMMENT ON CONSTRAINT {{ conn|qtIdent(name) }} ON DOMAIN {{ conn|qtIdent(o_data.nspname, o_data.relname) }}
    IS {{ data.description|qtLiteral }};{% endif %}
