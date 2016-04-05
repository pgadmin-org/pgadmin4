{% if data and schema and domain %}
ALTER DOMAIN {{ conn|qtIdent(schema, domain) }}
    ADD CONSTRAINT {{ conn|qtIdent(data.name) }} CHECK ({{ data.consrc }});{% endif -%}
