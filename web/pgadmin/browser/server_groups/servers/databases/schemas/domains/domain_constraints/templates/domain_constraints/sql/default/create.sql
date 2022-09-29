{% if data and schema and domain %}
ALTER DOMAIN {{ conn|qtIdent(schema, domain) }}
    ADD CONSTRAINT {{ conn|qtIdent(data.name) }} CHECK ({{ data.consrc }}){% if not data.convalidated %}

    NOT VALID{% endif %};{% if data.description %}


COMMENT ON CONSTRAINT {{ conn|qtIdent(data.name) }} ON DOMAIN {{ conn|qtIdent(schema, domain) }}
    IS '{{ data.description }}';{% endif %}
{% endif %}
