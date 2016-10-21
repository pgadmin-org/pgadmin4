{% if data %}
ALTER TABLE {{ conn|qtIdent(data.schema, data.table) }} DROP CONSTRAINT {{ conn|qtIdent(data.name) }}{% if cascade%} CASCADE{% endif %};
{% endif %}