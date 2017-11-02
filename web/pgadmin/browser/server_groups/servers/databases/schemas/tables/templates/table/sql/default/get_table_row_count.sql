SELECT COUNT(*)::text FROM {{ conn|qtIdent(data.schema, data.name) }};
