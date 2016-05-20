{% if data.name and o_data.name != data.name %}
ALTER TRIGGER {{ conn|qtIdent(o_data.name) }} ON {{ conn|qtIdent(o_data.nspname, o_data.relname) }}
    RENAME TO {{ conn|qtIdent(data.name) }};
{% endif %}
{% if data.description is defined  and o_data.description != data.description %}
COMMENT ON TRIGGER {{ conn|qtIdent(data.name) }} ON {{ conn|qtIdent(o_data.nspname, o_data.relname) }}
    IS {{data.description|qtLiteral}};
{% endif %}