{% if data %}
ALTER TABLE {{ conn|qtIdent(data.nspname, data.relname) }} DROP CONSTRAINT {{ conn|qtIdent(data.name) }};
{% endif %}
