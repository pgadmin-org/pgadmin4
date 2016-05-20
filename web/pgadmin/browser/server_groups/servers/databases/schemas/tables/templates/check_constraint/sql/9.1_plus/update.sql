{% if data.comment is defined and data.comment != o_data.comment %}
COMMENT ON CONSTRAINT {{ conn|qtIdent(o_data.name) }} ON {{ conn|qtIdent(o_data.nspname, o_data.relname) }}
    IS {{ data.comment|qtLiteral }};
{% endif %}