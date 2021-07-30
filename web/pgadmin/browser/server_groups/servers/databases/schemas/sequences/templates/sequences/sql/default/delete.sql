DROP SEQUENCE IF EXISTS {{ conn|qtIdent(data.schema) }}.{{ conn|qtIdent(data.name) }}{% if cascade%} CASCADE{% endif %};
