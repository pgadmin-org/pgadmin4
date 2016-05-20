{% if data.comment %}
COMMENT ON CONSTRAINT {{ conn|qtIdent(data.name) }} ON {{ conn|qtIdent(data.schema, data.table) }}
    IS {{ data.comment|qtLiteral }};
{% endif %}