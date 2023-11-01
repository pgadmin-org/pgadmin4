ALTER FOREIGN TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}} DROP COLUMN IF EXISTS {{conn|qtIdent(data.name)}};
