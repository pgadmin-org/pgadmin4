{% if data %}
ALTER TABLE IF EXISTS {{ conn|qtIdent(data.schema, data.table) }} DROP CONSTRAINT IF EXISTS {{ conn|qtIdent(data.name) }}{% if cascade%} CASCADE{% endif %};
{% endif %}
