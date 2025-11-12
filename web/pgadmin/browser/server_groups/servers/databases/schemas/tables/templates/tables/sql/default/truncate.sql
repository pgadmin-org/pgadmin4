TRUNCATE TABLE {{conn|qtIdent(data.schema, data.name)}}{% if identity %} RESTART IDENTITY{% endif %}{% if cascade %} CASCADE{% endif %};
