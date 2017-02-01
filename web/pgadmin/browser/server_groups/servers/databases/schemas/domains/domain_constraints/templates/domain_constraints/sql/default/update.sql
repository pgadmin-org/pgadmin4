{% if data.name %}
ALTER DOMAIN {{ conn|qtIdent(o_data.nspname, o_data.relname) }}
    RENAME CONSTRAINT {{ conn|qtIdent(o_data.name) }} TO {{ conn|qtIdent(data.name) }};{% endif %}
