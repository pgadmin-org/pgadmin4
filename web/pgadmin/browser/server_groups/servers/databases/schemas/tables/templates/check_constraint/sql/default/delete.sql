{% if data %}
ALTER TABLE IF EXISTS {{ conn|qtIdent(data.nspname, data.relname) }} DROP CONSTRAINT IF EXISTS {{ conn|qtIdent(data.name) }};
{% endif %}
