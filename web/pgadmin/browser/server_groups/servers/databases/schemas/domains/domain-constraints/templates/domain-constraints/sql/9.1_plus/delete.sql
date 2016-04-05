{% if data %}
ALTER DOMAIN {{ conn|qtIdent(data.nspname, data.relname) }}
    DROP CONSTRAINT {{ conn|qtIdent(data.name) }};
{% endif %}
